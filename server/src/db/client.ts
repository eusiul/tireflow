import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set — set it in server/.env before using database features')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

// Typed query helper
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now()
  const result = await pool.query<T>(text, params)
  const duration = Date.now() - start
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.warn(`Slow query (${duration}ms): ${text.slice(0, 80)}`)
  }
  return result
}

// Transaction helper
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function checkConnection(): Promise<void> {
  const client = await pool.connect()
  await client.query('SELECT 1')
  client.release()
}
