// One-time bootstrap for admin MFA. The app requires admins to have MFA enabled
// before they can sign in, but the normal enrollment routes require being signed
// in first — a chicken-and-egg for the very first admin. This seeds a TOTP secret
// directly, prints it so you can add it to your authenticator app, and enables MFA.
//
import 'dotenv/config'
import dotenv from 'dotenv'
import path from 'path'
import { query, pool } from '../db.js'
import { generateSecret, otpauthURL } from '../totp.js'
import { protectTotpSecret } from '../mfaSecrets.js'

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') })

const email = (process.env.ADMIN_EMAIL || '').toLowerCase()
if (!email) {
  console.error('ADMIN_EMAIL is required.')
  process.exit(1)
}

try {
  const { rows } = await query('SELECT id, email, role, totp_enabled FROM profiles WHERE email = $1', [email])
  const admin = rows[0]
  if (!admin) {
    console.error(`No account found for ${email}. Run create-admin first.`)
    process.exit(1)
  }
  if (admin.role !== 'admin') {
    console.error(`${email} is not an admin (role = ${admin.role}).`)
    process.exit(1)
  }

  const secret = generateSecret()
  // Store in the same format the app's own enrollment uses: encrypted at rest when
  // TOTP_SECRET_ENCRYPTION_KEY is set, plaintext otherwise. Login reverses this.
  await query(
    'UPDATE profiles SET totp_secret = $1, totp_enabled = true, updated_at = now() WHERE id = $2',
    [protectTotpSecret(secret), admin.id],
  )

  console.log(`\nMFA enrolled for ${email}.\n`)
  console.log('1) Add this to your authenticator app (Google Authenticator / Authy / 1Password):')
  console.log(`     Secret : ${secret}`)
  console.log('     Issuer : AFIT Nests')
  console.log(`     Account: ${email}`)
  console.log('     Type   : Time-based (TOTP)\n')
  console.log('   Or import this otpauth URL:')
  console.log(`     ${otpauthURL({ secret, label: email, issuer: 'AFIT Nests' })}\n`)
  console.log('2) Sign in with your password AND the 6-digit code the app shows.')
  console.log('   (You can re-run this script anytime to reset the secret if the app and login get out of sync.)')
} finally {
  await pool.end()
}
