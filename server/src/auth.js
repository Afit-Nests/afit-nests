import jwt from 'jsonwebtoken'
import { query } from './db.js'
import { assertStrongSecret } from './secrets.js'

const COOKIE_NAME = 'afit_nests_session'
const SESSION_TTL_SECONDS = 24 * 60 * 60

assertStrongSecret('JWT_SECRET')

export function signSession(profile) {
  return jwt.sign(
    { sub: profile.id, role: profile.role, sessionVersion: profile.session_version || 0 },
    process.env.JWT_SECRET,
    { expiresIn: SESSION_TTL_SECONDS, issuer: 'afit-nests' },
  )
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) return res.status(401).json({ error: 'Authentication required.' })

    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'afit-nests' })
    const { rows } = await query(
      `SELECT id, email, phone, role, full_name, matric_number, department, avatar_url, verified, session_version, totp_enabled, created_at
       FROM profiles
       WHERE id = $1`,
      [payload.sub],
    )

    if (!rows[0]) return res.status(401).json({ error: 'Session is no longer valid.' })
    if ((rows[0].session_version || 0) !== (payload.sessionVersion || 0)) {
      return res.status(401).json({ error: 'Session is no longer valid.' })
    }
    req.user = rows[0]
    next()
  } catch {
    return res.status(401).json({ error: 'Session is invalid or expired.' })
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) return next()

    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'afit-nests' })
    const { rows } = await query(
      `SELECT id, email, phone, role, full_name, matric_number, department, avatar_url, verified, session_version, totp_enabled, created_at
       FROM profiles
       WHERE id = $1`,
      [payload.sub],
    )

    req.user = rows[0] && (rows[0].session_version || 0) === (payload.sessionVersion || 0) ? rows[0] : null
    next()
  } catch {
    req.user = null
    next()
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Permission denied.' })
    next()
  }
}
