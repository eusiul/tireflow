/**
 * Simple migration runner — reads SQL files in order and applies them.
 * Run with: npm run db:migrate
 */
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool, checkConnection } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  console.log('🔌 Connecting to database...')
  await checkConnection()
  console.log('✅ Connected')

  const client = await pool.connect()

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id        SERIAL PRIMARY KEY,
        filename  TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const migrationsDir = resolve(__dirname, 'migrations')
    let files: string[] = []

    try {
      files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    } catch {
      console.log('No migrations directory found. Checking initial schema...')

      // Check if schema is already applied
      const { rows: existing } = await client.query(
        `SELECT to_regclass('public.tenants') AS tbl`
      )
      if (existing[0]?.tbl) {
        console.log('  ⏭  Schema already applied — registering migration record')
        await client.query(`INSERT INTO _migrations (filename) VALUES ('000_initial_schema.sql') ON CONFLICT DO NOTHING`)
        console.log('✅ Done')
        return
      }

      // Apply schema for the first time
      const schemaPath = resolve(__dirname, '../../../DATABASE_SCHEMA.sql')
      const sql = readFileSync(schemaPath, 'utf8')
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(`INSERT INTO _migrations (filename) VALUES ('000_initial_schema.sql') ON CONFLICT DO NOTHING`)
      await client.query('COMMIT')
      console.log('✅ Initial schema applied')
      return
    }

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [file]
      )
      if (rows.length > 0) {
        console.log(`  ⏭  ${file} (already applied)`)
        continue
      }

      console.log(`  ▶  Applying ${file}...`)
      const sql = readFileSync(resolve(migrationsDir, file), 'utf8')
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`  ✅ ${file}`)
    }

    console.log('\n🚀 All migrations applied successfully')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
