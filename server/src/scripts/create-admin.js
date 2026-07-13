import 'dotenv/config'
import dotenv from 'dotenv'
import path from 'path'
import bcrypt from 'bcryptjs'
import { query, pool } from '../db.js'
import { PASSWORD_REQUIREMENTS, isComplexPassword } from '../passwordPolicy.js'

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') })

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const fullName = process.env.ADMIN_NAME || 'AFIT Nests Admin'

if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required.')
  process.exit(1)
}

// The default admin email is published in this repo, so it is a known-username
// target. Refuse it in production; a distinct address raises the attacker's cost.
if (process.env.NODE_ENV === 'production' && email.toLowerCase() === 'admin@afitnests.com') {
  console.error('ADMIN_EMAIL must not be the default admin@afitnests.com in production.')
  process.exit(1)
}

if (!isComplexPassword(password)) {
  console.error(`ADMIN_PASSWORD is not complex enough. ${PASSWORD_REQUIREMENTS}`)
  process.exit(1)
}

try {
  const passwordHash = await bcrypt.hash(password, 12)
  await query(
    `INSERT INTO profiles (email, password_hash, role, full_name, verified)
     VALUES ($1, $2, 'admin', $3, true)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'admin',
           full_name = EXCLUDED.full_name,
           verified = true,
           totp_secret = NULL,
           totp_enabled = false,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = now()`,
    [email.toLowerCase(), passwordHash, fullName],
  )

  console.log(`Admin account ready: ${email.toLowerCase()}`)
} finally {
  await pool.end()
}
