// Applies SQL migration files using the project's existing pg config (server/db.js),
// so no psql client is needed. Reuses the same DATABASE_URL / SSL settings the app
// uses, which means it "just works" anywhere the app itself can reach the database
// (e.g. a Render Shell on the API service).
//
// Usage:
//   node server/src/scripts/run-migrations.js                 # applies the pending security migrations
//   node server/src/scripts/run-migrations.js 006_foo.sql ... # applies specific files (in the order given)
//
// Files are read from server/sql/. Each of the default migrations is idempotent
// (ADD COLUMN IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS), so re-running is safe.
import fs from 'fs/promises'
import path from 'path'
import { pool } from '../db.js'

// Default set is *every* SQL file in numeric order. On a brand-new
// database this brings the schema from empty to fully migrated. On a
// populated database the IF-NOT-EXISTS guards mean nothing changes.
const DEFAULT_MIGRATIONS = [
  '001_schema.sql',
  '002_product_features.sql',
  '003_security_hardening.sql',
  '004_login_throttle.sql',
  '005_admin_mfa.sql',
  '006_profile_avatar.sql',
  '007_google_oauth.sql',
]

const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_MIGRATIONS
const sqlDir = path.resolve(process.cwd(), 'server', 'sql')

try {
  for (const name of files) {
    const sql = await fs.readFile(path.resolve(sqlDir, name), 'utf8')
    process.stdout.write(`Applying ${name} ... `)
    await pool.query(sql)
    console.log('done')
  }
  console.log(`\nAll ${files.length} migration(s) applied successfully.`)
} catch (error) {
  console.error('\nMigration failed:', error.message)
  console.error('No further files were applied. Fix the cause and re-run (migrations are idempotent).')
  process.exitCode = 1
} finally {
  await pool.end()
}
