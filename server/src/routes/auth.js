import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from '../auth.js'
import { query } from '../db.js'
import { googleLimiter, loginLimiter, validate } from '../middleware.js'
import { passwordSchema } from '../passwordPolicy.js'
import { generateSecret, verifyTotp, otpauthURL } from '../totp.js'
import { assertPasswordNotBreached } from '../breachedPasswords.js'
import { adminMfaRequired, protectTotpSecret, unprotectTotpSecret } from '../mfaSecrets.js'
import { sendPasswordResetEmail } from '../email.js'
import {
  STATE_COOKIE_NAME, STATE_COOKIE_TTL_MS, assertGoogleConfig, buildAuthorizeUrl,
  buildClientRedirect, buildStateCookie, deriveCodeChallenge, exchangeCodeForTokens,
  generateCodeVerifier, generateState, isGoogleEnabled, readStateCookie,
  verifyGoogleIdToken,
} from '../google.js'

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

// Unlinking Google is a permanent account-control change. Require a recent
// password to make sure a hijacked live session cannot strip a user's only
// second factor (a Google-linked account without a password would lose all
// access if the OAuth link were dropped).
const unlinkGoogleSchema = z.object({
  body: z.object({
    password: z.string().min(1).max(128),
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
  google_sub: row.google_sub ?? null,
  google_linked_at: row.google_linked_at ?? null,
  created_at: row.created_at,
})

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const exposeResetUrl = () => process.env.ALLOW_DEV_RESET_URL === 'true'

router.post('/register/student', loginLimiter, validate(registerStudentSchema), async (req, res, next) => {
  try {
    const { email, password, fullName, matricNumber, department, phone } = req.validated.body
    await assertPasswordNotBreached(password)
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
    await assertPasswordNotBreached(password)
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
    if (profile.role === 'admin' && adminMfaRequired() && !profile.totp_enabled) {
      return res.status(403).json({ error: 'Admin MFA is required before this account can sign in.' })
    }

    if (profile.totp_enabled) {
      if (!totpCode) return res.json({ mfaRequired: true })
      if (!verifyTotp(unprotectTotpSecret(profile.totp_secret), totpCode)) {
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
      try {
        await sendPasswordResetEmail({ to: profile.email, resetUrl })
      } catch (error) {
        console.warn(`Password reset email failed: ${error.message}`)
      }
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
    await assertPasswordNotBreached(password)
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

// --- Google sign-in (OAuth 2.0 authorization code flow with PKCE) ---
//
// This is a server-side redirect flow. There is no client-side Google SDK
// and no id_token in the browser. The browser is sent to Google with a
// one-time PKCE challenge and a one-time state; on the callback we exchange
// the code for tokens server-to-server, verify the id_token against
// Google's JWKS, and run the same find-or-create-and-link logic the
// id_token path used. The session cookie is the same one /auth/login sets.

// Kick the browser into the Google authorize URL. We always mint a fresh
// verifier + state, even if the user reloads, so a stale cookie from a
// previous attempt cannot be replayed.
router.get('/google/start', googleLimiter, (req, res, next) => {
  try {
    if (!isGoogleEnabled()) {
      return res.redirect(buildClientRedirect({ clientOrigin: clientOriginFor(req), error: 'google_not_configured' }))
    }
    const { clientId } = assertGoogleConfig()
    const verifier = generateCodeVerifier()
    const state = generateState()
    const challenge = deriveCodeChallenge(verifier)
    const redirectUri = googleRedirectUri(req)
    const url = buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge: challenge })

    // Stash verifier+state in a short-lived signed cookie. The cookie is
    // httpOnly + sameSite=lax (not strict: we need it to come back on the
    // cross-origin callback GET) and Secure in production. It is purged
    // by /auth/google/callback whether the exchange succeeds or fails, so
    // there is no way for a stale verifier to be reused.
    res.cookie(STATE_COOKIE_NAME, buildStateCookie(verifier, state), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: STATE_COOKIE_TTL_MS,
    })
    res.redirect(302, url)
  } catch (error) {
    next(error)
  }
})

// Google redirects the user back here with `?code=…&state=…`. We verify
// state against the signed cookie (CSRF mitigation), exchange the code
// for tokens server-to-server using the stashed verifier, verify the
// id_token against Google's JWKS, then run the find-or-create flow.
router.get('/google/callback', googleLimiter, async (req, res, next) => {
  const fail = (error) => {
    // Always clear the state cookie, even on failure, so a stale verifier
    // cannot be retried.
    res.clearCookie(STATE_COOKIE_NAME, { path: '/' })
    res.redirect(buildClientRedirect({ clientOrigin: clientOriginFor(req), error }))
  }
  try {
    if (!isGoogleEnabled()) return fail('google_not_configured')

    const { code, state, error: oauthError } = req.query
    if (oauthError) return fail(String(oauthError))
    if (typeof code !== 'string' || !code) return fail('missing_code')
    if (typeof state !== 'string' || !state) return fail('missing_state')

    const cookieValue = req.cookies?.[STATE_COOKIE_NAME]
    const stored = readStateCookie(cookieValue)
    if (!stored) return fail('invalid_or_expired_state')
    if (stored.state !== state) return fail('state_mismatch')

    // From this point we MUST clear the cookie before any async work, so a
    // network error or crash does not leave a replayable verifier around.
    res.clearCookie(STATE_COOKIE_NAME, { path: '/' })

    const { clientId, clientSecret } = assertGoogleConfig()
    const redirectUri = googleRedirectUri(req)
    const tokenResponse = await exchangeCodeForTokens({
      code, codeVerifier: stored.verifier, clientId, clientSecret, redirectUri,
    })
    const googleProfile = await verifyGoogleIdToken(tokenResponse.id_token, clientId)

    const result = await findOrCreateGoogleProfile(googleProfile)
    const token = signSession(result.profile)
    setSessionCookie(res, token)

    const target = buildClientRedirect({
      clientOrigin: clientOriginFor(req),
      role: result.profile.role,
      needsProfileCompletion: result.needsProfileCompletion,
    })
    res.redirect(302, target)
  } catch (error) {
    // Same code path as the early `fail` helper — clear the cookie and
    // bounce the user back to the SPA with a generic error code. Never
    // surface internal error details in the redirect.
    if (error.message && /Google|JWKS|token|JWS|signature|claim|issuer|audience/i.test(error.message)) {
      return fail('verification_failed')
    }
    next(error)
  }
})

// CSRF protection skips the OAuth callback GET (it is a redirect endpoint,
// not a state-changing POST). Anything else under /auth/google still
// requires the CSRF token because it is a state-changing request.
function skipCsrf(req) {
  return req.method === 'GET' && (req.path === '/google/start' || req.path === '/google/callback')
}

// Build the redirect_uri we register in Google Cloud Console.
//
// In a same-origin deployment (SPA and backend on the same domain) we build
// this from the request host so it matches whatever origin the user hit.
//
// In a split deployment (SPA on Vercel, backend on Render) we MUST build it
// from CLIENT_ORIGIN so the callback goes through the frontend (Vercel), not
// directly to the backend. If the callback hits the backend directly, the
// session cookie gets set on the backend's domain and the SPA (on the
// frontend domain) never receives it — resulting in a silent 401 and a
// blank dashboard screen. When the callback goes through the frontend,
// Vercel's rewrite proxies it to the backend and the session cookie is set
// on the frontend domain, so it's accessible to the SPA on the next call.
function googleRedirectUri(req) {
  const clientOrigin = process.env.CLIENT_ORIGIN
  if (clientOrigin && clientOrigin !== 'http://localhost:5173') {
    // Production split-deployment: callback must go through the frontend
    // so cookies land on the SPA's domain, not the backend's.
    return `${clientOrigin}/api/auth/google/callback`
  }
  // Dev / same-origin fallback: build from the request host.
  // Trust X-Forwarded-* because we set `app.set('trust proxy', 1)`.
  const proto = req.headers['x-forwarded-proto'] || req.protocol
  const host = req.headers['x-forwarded-host'] || req.get('host')
  return `${proto}://${host}/api/auth/google/callback`
}

function clientOriginFor(req) {
  // Prefer the explicitly configured client origin, fall back to the
  // request host so the callback still works if the operator forgot to
  // set CLIENT_ORIGIN. CORS will still enforce the allowlist on the next
  // call, so this is only used for the redirect URL.
  return (process.env.CLIENT_ORIGIN || '').split(',')[0].trim() || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`
}

// The shared find-or-create-and-link logic used by the callback. Returns
// the profile and a needsProfileCompletion flag (true when a brand-new
// student account was minted from Google and the user should be prompted
// to fill in their profile on first login).
async function findOrCreateGoogleProfile(googleProfile) {
  // 1) Stable sub first. Two profiles cannot share a sub (partial unique
  // index), so this is unambiguous.
  const { rows: bySub } = await query(
    `SELECT id, email, phone, role, full_name, matric_number, department, avatar_url, verified,
            session_version, totp_enabled, google_sub, created_at
     FROM profiles WHERE google_sub = $1`,
    [googleProfile.sub],
  )
  if (bySub[0]) return { profile: bySub[0], needsProfileCompletion: false }

  // 2) Match by verified email, attach Google to the existing account.
  const { rows: byEmail } = await query(
    `SELECT id, email, phone, role, full_name, matric_number, department, avatar_url, verified,
            session_version, totp_enabled, google_sub, created_at
     FROM profiles WHERE email = $1`,
    [googleProfile.email],
  )
  if (byEmail[0]) {
    const profile = byEmail[0]
    if (profile.role !== 'student' && profile.role !== 'landlord') {
      // Same policy as the old id_token path: admins are operator-created
      // and gated on TOTP, never linkable from OAuth.
      throw new Error('This email is associated with an account that does not support Google sign-in.')
    }
    const { rows: updated } = await query(
      `UPDATE profiles SET google_sub = $1, google_linked_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING id, email, phone, role, full_name, matric_number, department, avatar_url, verified,
                 session_version, totp_enabled, google_sub, created_at`,
      [googleProfile.sub, profile.id],
    )
    return { profile: updated[0], needsProfileCompletion: false }
  }

  // 3) New account. Same gating: only when ALLOW_GOOGLE_SIGNUP is on.
  if (process.env.ALLOW_GOOGLE_SIGNUP !== 'true') {
    throw new Error('No account is linked to this Google profile. Please sign up with email first.')
  }
  const fullName = (googleProfile.name || googleProfile.email.split('@')[0] || 'Student').slice(0, 120)
  const provisionalMatric = `GOOGLE-${googleProfile.sub.slice(0, 8).toUpperCase()}`
  const provisionalDepartment = 'Unspecified'
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), PASSWORD_COST)

  try {
    const { rows } = await query(
      `INSERT INTO profiles (
         email, password_hash, role, full_name, matric_number, department,
         verified, google_sub, google_linked_at
       ) VALUES ($1, $2, 'student', $3, $4, $5, true, $6, now())
       RETURNING id, email, phone, role, full_name, matric_number, department, avatar_url, verified,
                 session_version, totp_enabled, google_sub, created_at`,
      [googleProfile.email, passwordHash, fullName, provisionalMatric, provisionalDepartment, googleProfile.sub],
    )
    return { profile: rows[0], needsProfileCompletion: true }
  } catch (error) {
    if (error.code === '23505') {
      const { rows: raced } = await query(
        `SELECT id, email, phone, role, full_name, matric_number, department, avatar_url, verified,
                session_version, totp_enabled, google_sub, created_at
         FROM profiles WHERE google_sub = $1 OR email = $2`,
        [googleProfile.sub, googleProfile.email],
      )
      if (raced[0]) return { profile: raced[0], needsProfileCompletion: false }
    }
    throw error
  }
}

// Unlink Google from the current account. Requires a correct password so a
// stolen session cannot turn a Google-only account into a passwordless one
// and then evict the OAuth link.
router.delete('/google', requireAuth, validate(unlinkGoogleSchema), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT password_hash, google_sub, email FROM profiles WHERE id = $1`,
      [req.user.id],
    )
    const record = rows[0]
    if (!record?.google_sub) {
      return res.status(400).json({ error: 'Google sign-in is not linked to this account.' })
    }
    const ok = await bcrypt.compare(req.validated.body.password, record.password_hash)
    if (!ok) return res.status(401).json({ error: 'Password is incorrect.' })

    await query(
      `UPDATE profiles SET google_sub = NULL, google_linked_at = NULL, updated_at = now() WHERE id = $1`,
      [req.user.id],
    )
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// Exported for tests so the OAuth callback's CSRF exemption is applied
// identically in app.js (where the middleware is mounted).
export { skipCsrf as _skipGoogleCsrf }

// --- Multi-factor authentication (TOTP) ---

// Begin enrollment: generate a secret (stored but not yet active) and return the
// provisioning details. Requires re-confirmation before it takes effect.
router.post('/mfa/setup', requireAuth, async (req, res, next) => {
  try {
    if (req.user.totp_enabled) return res.status(409).json({ error: 'MFA is already enabled. Disable it first to re-enroll.' })
    const secret = generateSecret()
    await query(
      `UPDATE profiles SET totp_secret = $1, totp_enabled = false, updated_at = now() WHERE id = $2`,
      [protectTotpSecret(secret), req.user.id],
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
    if (!verifyTotp(unprotectTotpSecret(record.totp_secret), req.validated.body.code)) {
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
    if (!verifyTotp(unprotectTotpSecret(record.totp_secret), req.validated.body.code)) {
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
