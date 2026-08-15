import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'

const { Pool } = pg

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for the backend server.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon and most hosted Postgres require TLS. Honour an explicit
  // DATABASE_SSL=true toggle, and also turn SSL on when the connection
  // string opts in via `?sslmode=require` (Neon's default URL format).
  // Self-hosted databases without TLS still work because their URL
  // won't carry the sslmode flag and DATABASE_SSL stays false.
  ssl: process.env.DATABASE_SSL === 'true' || /sslmode=require/i.test(process.env.DATABASE_URL || '')
    ? { rejectUnauthorized: true }
    : false,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function transaction(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
