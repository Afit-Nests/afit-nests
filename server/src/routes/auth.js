import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from '../auth.js'
import { query } from '../db.js'
import { loginLimiter, validate } from '../middleware.js'
import { passwordSchema } from '../passwordPolicy.js'

const router = Router()
const PASSWORD_COST = 12

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
  }).refine(value => value.email || value.phone, 'Email or phone is required.'),
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
  verified: row.verified,
  created_at: row.created_at,
})

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

router.post('/register/student', validate(registerStudentSchema), async (req, res, next) => {
  try {
    const { email, password, fullName, matricNumber, department, phone } = req.validated.body
    const passwordHash = await bcrypt.hash(password, PASSWORD_COST)
    const { rows } = await query(
      `INSERT INTO profiles (email, phone, password_hash, role, full_name, matric_number, department, verified)
       VALUES ($1, $2, $3, 'student', $4, $5, $6, true)
       RETURNING id, email, phone, role, full_name, matric_number, department, verified, created_at`,
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

router.post('/register/landlord', validate(registerLandlordSchema), async (req, res, next) => {
  try {
    const { phone, password, fullName, nin, address } = req.validated.body
    const email = `landlord_${phone}@afitnests.com`.toLowerCase()
    const passwordHash = await bcrypt.hash(password, PASSWORD_COST)
    const { rows } = await query(
      `INSERT INTO profiles (email, phone, password_hash, role, full_name, nin, address, verified)
       VALUES ($1, $2, $3, 'landlord', $4, $5, $6, false)
       RETURNING id, email, phone, role, full_name, verified, created_at`,
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
      `SELECT id, email, phone, password_hash, role, full_name, matric_number, department, verified, created_at
       FROM profiles
       WHERE ${lookup[0]} AND role = $2`,
      [lookup[1], role],
    )

    const profile = rows[0]
    if (!profile || !(await bcrypt.compare(password, profile.password_hash))) {
      return res.status(401).json({ error: 'Invalid login details.' })
    }

    const token = signSession(profile)
    setSessionCookie(res, token)
    res.json({ user: publicProfile(profile) })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', requireAuth, (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
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
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/password/reset', validate(resetPasswordSchema), async (req, res, next) => {
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

    await query(`UPDATE profiles SET password_hash = $1, updated_at = now() WHERE id = $2`, [passwordHash, resetToken.profile_id])
    clearSessionCookie(res)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
