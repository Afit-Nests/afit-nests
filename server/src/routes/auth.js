import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from '../auth.js'
import { query } from '../db.js'
import { loginLimiter, validate } from '../middleware.js'
import { passwordSchema } from '../passwordPolicy.js'
import { generateSecret, verifyTotp, otpauthURL } from '../totp.js'

const router = Router()
const PASSWORD_COST = 12
// A precomputed bcrypt hash of a random string. Compared against when no account is
// found so the login response time does not reveal whether an account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), PASSWORD_COST)

// Per-account lockout. After LOCK_THRESHOLD consecutive failures the account is
// locked for an exponentially growing window (capped), which stops a distributed
// brute force that the per-IP limiter alone cannot. Attempts made while already
// locked are rejected without a bcrypt check and do not extend the window, so an
// attacker cannot lock a victim out indefinitely.
const LOCK_THRESHOLD = 5
const LOCK_CAP_MINUTES = 15
const lockMinutesFor = (attempts) =>
  Math.min(LOCK_CAP_MINUTES, 2 ** Math.max(0, attempts - LOCK_THRESHOLD))

const registerStudentSchema = z.object({
  body: z.object({
    email: z.email(),
    password: passwordSchema(z),
    fullName: z.string().min(2).max(120),
    matricNumber: z.string().min(2).max(60),
    department: z.string().min(2).max(120),
    phone: z.string().min(7).max(30),
  }),
})

const registerLandlordSchema = z.object({
  body: z.object({
    phone: z.string().min(7).max(30),
    password: passwordSchema(z),
    fullName: z.string().min(2).max(120),
    nin: z.string().min(6).max(30),
    address: z.string().min(5).max(240),
  }),
})

const loginSchema = z.object({
  body: z.object({
    email: z.email().optional(),
    phone: z.string().min(7).max(30).optional(),
    password: z.string().min(1).max(128),
    role: z.enum(['student', 'landlord', 'admin']),
    totpCode: z.string().regex(/^\d{6}$/).optional(),
  }).refine(value => value.email || value.phone, 'Email or phone is required.'),
})

const mfaCodeSchema = z.object({
  body: z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.') }),
})

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email(),
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(32).max(200),
    password: passwordSchema(z),
  }),
})

const publicProfile = (row) => ({
  id: row.id,
  email: row.email,
  phone: row.phone,
  role: row.role,
  full_name: row.full_name,
  matric_number: row.matric_number,
  department: row.department,
  avatar_url: row.avatar_url ?? null,
  verified: row.verified,
  totp_enabled: row.totp_enabled ?? false,
  created_at: row.created_at,
})

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const exposeResetUrl = () => process.env.ALLOW_DEV_RESET_URL === 'true'

router.post('/register/student', loginLimiter, validate(registerStudentSchema), async (req, res, next) => {
  try {
    const { email, password, fullName, matricNumber, department, phone } = req.validated.body
    const passwordHash = await bcrypt.hash(password, PASSWORD_COST)
    const { rows } = await query(
      `INSERT INTO profiles (email, phone, password_hash, role, full_name, matric_number, department, verified)
       VALUES ($1, $2, $3, 'student', $4, $5, $6, true)
       RETURNING id, email, phone, role, full_name, matric_number, department, verified, session_version, created_at`,
      [email.toLowerCase(), phone, passwordHash, fullName, matricNumber, department],
    )
    const token = signSession(rows[0])
    setSessionCookie(res, token)
    res.status(201).json({ user: publicProfile(rows[0]) })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Account already exists.' })
    next(error)
  }
})

router.post('/register/landlord', loginLimiter, validate(registerLandlordSchema), async (req, res, next) => {
  try {
    const { phone, password, fullName, nin, address } = req.validated.body
    const email = `landlord_${phone}@afitnests.com`.toLowerCase()
    const passwordHash = await bcrypt.hash(password, PASSWORD_COST)
    const { rows } = await query(
      `INSERT INTO profiles (email, phone, password_hash, role, full_name, nin, address, verified)
       VALUES ($1, $2, $3, 'landlord', $4, $5, $6, false)
       RETURNING id, email, phone, role, full_name, verified, session_version, created_at`,
      [email, phone, passwordHash, fullName, nin, address],
    )
    const token = signSession(rows[0])
    setSessionCookie(res, token)
    res.status(201).json({ user: publicProfile(rows[0]) })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Account already exists.' })
    next(error)
  }
})

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, phone, password, role } = req.validated.body
    const lookup = role === 'landlord'
      ? ['phone = $1', phone]
      : ['email = $1', email?.toLowerCase()]

    const { rows } = await query(
      `SELECT id, email, phone, password_hash, role, full_name, matric_number, department, verified,
              session_version, failed_login_attempts, locked_until, totp_secret, totp_enabled, created_at
       FROM profiles
       WHERE ${lookup[0]} AND role = $2`,
      [lookup[1], role],
    )

    const profile = rows[0]
    const { totpCode } = req.validated.body
    const invalid = () => res.status(401).json({ error: 'Invalid login details.' })
    const registerFailure = async () => {
      const attempts = (profile.failed_login_attempts || 0) + 1
      const lockMinutes = attempts >= LOCK_THRESHOLD ? lockMinutesFor(attempts) : 0
      await query(
        `UPDATE profiles
         SET failed_login_attempts = $2,
             locked_until = CASE WHEN $3::int > 0 THEN now() + ($3 || ' minutes')::interval ELSE locked_until END,
             updated_at = now()
         WHERE id = $1`,
        [profile.id, attempts, lockMinutes],
      )
    }

    // Locked account: burn constant time, do not run bcrypt, do not extend the lock.
    if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
      return invalid()
    }

    const passwordOk = await bcrypt.compare(password, profile?.password_hash || DUMMY_PASSWORD_HASH)
    if (!profile || !passwordOk) {
      if (profile) await registerFailure()
      return invalid()
    }

    // Second factor. Only reached after a correct password, so telling the client
    // that MFA is required (or that a code was wrong) does not aid enumeration.
    // Wrong codes count toward the same lockout, making a 6-digit brute force futile.
    if (profile.totp_enabled) {
      if (!totpCode) return res.json({ mfaRequired: true })
      if (!verifyTotp(profile.totp_secret, totpCode)) {
        await registerFailure()
        return res.status(401).json({ error: 'Invalid authentication code.' })
      }
    }

    // Success: clear any accumulated failures before issuing the session.
    if (profile.failed_login_attempts > 0 || profile.locked_until) {
      await query(
        `UPDATE profiles SET failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1`,
        [profile.id],
      )
    }

    const token = signSession(profile)
    setSessionCookie(res, token)
    res.json({ user: publicProfile(profile) })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await query(`UPDATE profiles SET session_version = session_version + 1, updated_at = now() WHERE id = $1`, [req.user.id])
    clearSessionCookie(res)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

router.post('/password/forgot', loginLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const email = req.validated.body.email.toLowerCase()
    const { rows } = await query(`SELECT id, email FROM profiles WHERE email = $1`, [email])
    const profile = rows[0]

    let resetUrl = null
    if (profile) {
      const token = crypto.randomBytes(32).toString('hex')
      await query(
        `INSERT INTO password_reset_tokens (profile_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
        [profile.id, hashResetToken(token)],
      )
      resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`
    }

    res.json({
      ok: true,
      resetUrl: exposeResetUrl() ? resetUrl : undefined,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/password/reset', loginLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.validated.body
    const tokenHash = hashResetToken(token)
    const passwordHash = await bcrypt.hash(password, PASSWORD_COST)

    const { rows } = await query(
      `UPDATE password_reset_tokens
       SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING profile_id`,
      [tokenHash],
    )

    const resetToken = rows[0]
    if (!resetToken) return res.status(400).json({ error: 'Invalid or expired reset link.' })

    await query(
      `UPDATE profiles
       SET password_hash = $1, session_version = session_version + 1,
           failed_login_attempts = 0, locked_until = NULL, updated_at = now()
       WHERE id = $2`,
      [passwordHash, resetToken.profile_id],
    )
    clearSessionCookie(res)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// --- Multi-factor authentication (TOTP) ---

// Begin enrollment: generate a secret (stored but not yet active) and return the
// provisioning details. Requires re-confirmation before it takes effect.
router.post('/mfa/setup', requireAuth, async (req, res, next) => {
  try {
    if (req.user.totp_enabled) return res.status(409).json({ error: 'MFA is already enabled. Disable it first to re-enroll.' })
    const secret = generateSecret()
    await query(
      `UPDATE profiles SET totp_secret = $1, totp_enabled = false, updated_at = now() WHERE id = $2`,
      [secret, req.user.id],
    )
    res.json({
      secret,
      otpauthUrl: otpauthURL({ secret, label: req.user.email || req.user.phone || req.user.id, issuer: 'AFIT Nests' }),
    })
  } catch (error) {
    next(error)
  }
})

// Confirm enrollment: verify a code against the pending secret, then activate.
router.post('/mfa/enable', requireAuth, validate(mfaCodeSchema), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT totp_secret, totp_enabled FROM profiles WHERE id = $1`, [req.user.id])
    const record = rows[0]
    if (!record?.totp_secret) return res.status(400).json({ error: 'Start MFA setup before enabling.' })
    if (record.totp_enabled) return res.status(409).json({ error: 'MFA is already enabled.' })
    if (!verifyTotp(record.totp_secret, req.validated.body.code)) {
      return res.status(400).json({ error: 'That code is incorrect. Check your authenticator app and try again.' })
    }
    await query(`UPDATE profiles SET totp_enabled = true, updated_at = now() WHERE id = $1`, [req.user.id])
    res.json({ ok: true, totp_enabled: true })
  } catch (error) {
    next(error)
  }
})

// Disable: require a valid current code so a hijacked live session can't quietly
// strip the account's second factor.
router.post('/mfa/disable', requireAuth, validate(mfaCodeSchema), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT totp_secret, totp_enabled FROM profiles WHERE id = $1`, [req.user.id])
    const record = rows[0]
    if (!record?.totp_enabled) return res.status(400).json({ error: 'MFA is not enabled.' })
    if (!verifyTotp(record.totp_secret, req.validated.body.code)) {
      return res.status(400).json({ error: 'That code is incorrect.' })
    }
    await query(`UPDATE profiles SET totp_secret = NULL, totp_enabled = false, updated_at = now() WHERE id = $1`, [req.user.id])
    res.json({ ok: true, totp_enabled: false })
  } catch (error) {
    next(error)
  }
})

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    await query(
      `UPDATE profiles
       SET email = 'deleted_' || id::text || '@deleted.afitnests.local',
           phone = NULL,
           full_name = 'Deleted user',
           matric_number = NULL,
           department = NULL,
           nin = NULL,
           address = NULL,
           verified = false,
           session_version = session_version + 1,
           updated_at = now()
       WHERE id = $1`,
      [req.user.id],
    )
    clearSessionCookie(res)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

export default router
