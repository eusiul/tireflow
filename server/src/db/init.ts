import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool, checkConnection } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function init() {
  console.log('🔌 Connecting to database...')
  await checkConnection()
  console.log('✅ Connected')

  const client = await pool.connect()
  try {
    // Apply schema if tables don't exist
    const { rows } = await client.query(
      `SELECT to_regclass('public.tenants') AS tbl`
    )
    if (!rows[0]?.tbl) {
      console.log('📦 Applying database schema...')
      const schemaPath = resolve(__dirname, '../../DATABASE_SCHEMA.sql')
      const sql = readFileSync(schemaPath, 'utf8')
      await client.query(sql)
      console.log('✅ Schema applied')
    } else {
      console.log('✅ Schema already exists')
    }

    // Create admin user if not exists
    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE email = 'admin@tireflow.com' LIMIT 1`
    )
    if (existing.length === 0) {
      console.log('👤 Creating admin user...')
      const hash = await bcrypt.hash('Admin123!', 10)
      await client.query('BEGIN')
      const { rows: [tenant] } = await client.query<{ id: string }>(
        `INSERT INTO tenants (name, slug, plan, plan_status, primary_color)
         VALUES ('TireFlow Demo', 'tireflow-demo', 'pro', 'active', '#ef4444')
         ON CONFLICT (slug) DO UPDATE SET plan_status = 'active'
         RETURNING id`
      )
      await client.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
         VALUES ($1, 'Administrador', 'admin@tireflow.com', $2, 'admin', true)
         ON CONFLICT DO NOTHING`,
        [tenant.id, hash]
      )
      await client.query('COMMIT')
      console.log('✅ Admin user created: admin@tireflow.com / Admin123!')
    } else {
      console.log('✅ Admin user already exists')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

init().catch((err) => {
  console.error('❌ Init failed:', err)
  process.exit(1)
})
