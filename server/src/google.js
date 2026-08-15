// Google OAuth helpers — server-side authorization code flow with PKCE.
//
// We use the OAuth 2.0 authorization code flow with PKCE (RFC 7636). The
// browser is sent to Google's authorize URL with a `code_challenge` (SHA-256
// of a high-entropy `code_verifier`). The `code_verifier` and an
// unguessable `state` are stashed in a short-lived, HMAC-signed cookie
// (`afit_nests_oauth_state`) on the user's browser; on the callback we
// verify the cookie's signature, that the state matches, then POST the
// `code` + `code_verifier` to Google's token endpoint, then verify the
// returned id_token against Google's published JWKS — never against the
// network `tokeninfo` endpoint, because asymmetric verification (RS256 +
// JWKS) is the cryptographically-correct check for a JWT.
//
// The same find-or-create-and-link policy that the id_token path used still
// applies: stable Google `sub` is the link key, verified email is the
// one-time attachment hint, and new accounts can only be minted when
// ALLOW_GOOGLE_SIGNUP is enabled.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs')
const ALLOWED_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])

const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i
// Confidential client (server-side) has a `client_secret` issued alongside
// the client id. Without it the token-exchange call returns `invalid_client`.
const CLIENT_SECRET_PATTERN = /^[A-Za-z0-9_-]{16,}$/

const PKCE_TTL_MS = 10 * 60 * 1000 // 10 minutes; Google allows up to 30 but we tighten it.
export const STATE_COOKIE_NAME = 'afit_nests_oauth_state'

// Reads COOKIE_SECRET on every call rather than caching it at module load.
// The test harness hoists ESM imports above the test body, so a cached
// value would be captured before the test sets the secret, leaving the
// server unable to sign the OAuth state cookie. A single process.env read
// per OAuth round-trip is negligible.
function stateHmacKey() {
  return process.env.COOKIE_SECRET || ''
}

// JWKS injection hook. In production we always serve from Google's real
// JWKS endpoint. In tests, we inject a local key set so the network round-
// trip is skipped (and is deterministic). The setter is the only way to
// override `getJwks`, and there is no production caller for it.
let jwksOverride = null

let jwksCache = null
function getJwks() {
  if (jwksOverride) return jwksOverride
  if (!jwksCache) jwksCache = createRemoteJWKSet(JWKS_URL, { cooldownDuration: 30_000, cacheMaxAge: 600_000 })
  return jwksCache
}

// Test-only: install a local JWKS so tests do not have to hit the network
// and can sign their own JWTs with a known private key.
export function _setJwksForTests(localGetKey) {
  jwksOverride = localGetKey
}

export function isGoogleEnabled() {
  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  return Boolean(id) && CLIENT_ID_PATTERN.test(id) && Boolean(secret) && CLIENT_SECRET_PATTERN.test(secret)
}

export function assertGoogleConfig() {
  const id = process.env.GOOGLE_CLIENT_ID
  if (!id) throw new Error('GOOGLE_CLIENT_ID is not configured.')
  if (!CLIENT_ID_PATTERN.test(id)) {
    throw new Error('GOOGLE_CLIENT_ID does not look like a valid Google OAuth client id.')
  }
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!secret) throw new Error('GOOGLE_CLIENT_SECRET is not configured.')
  if (!CLIENT_SECRET_PATTERN.test(secret)) {
    throw new Error('GOOGLE_CLIENT_SECRET does not look like a valid Google OAuth client secret.')
  }
  return { clientId: id, clientSecret: secret }
}

// --- PKCE ---

// Per RFC 7636, code_verifier is 43-128 chars of [A-Z a-z 0-9 - . _ ~]. 64
// random bytes -> 86 chars of base64url, well within the bounds.
export function generateCodeVerifier() {
  return base64UrlEncode(randomBytes(64))
}

export function deriveCodeChallenge(verifier) {
  return base64UrlEncode(createHash('sha256').update(verifier).digest())
}

function base64UrlEncode(buffer) {
  return Buffer.from(buffer).toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function generateState() {
  return base64UrlEncode(randomBytes(32))
}

// --- State cookie: signed (HMAC-SHA256), not encrypted ---
// The cookie is opaque and the contents are not sensitive; the signature
// only needs to make it impossible for an attacker to forge a matching
// state/verifier pair.

export function buildStateCookie(verifier, state) {
  const key = stateHmacKey()
  if (!key) throw new Error('COOKIE_SECRET is required to sign the OAuth state cookie.')
  const payload = JSON.stringify({ v: verifier, s: state, t: Date.now() })
  const body = base64UrlEncode(Buffer.from(payload))
  const sig = base64UrlEncode(createHmac('sha256', key).update(body).digest())
  return `${body}.${sig}`
}

export function readStateCookie(cookieValue) {
  const key = stateHmacKey()
  if (!cookieValue || !key) return null
  const [body, sig] = cookieValue.split('.')
  if (!body || !sig) return null
  const expected = base64UrlEncode(createHmac('sha256', key).update(body).digest())
  if (expected.length !== sig.length) return null
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
  let parsed
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!parsed?.v || !parsed?.s || typeof parsed.t !== 'number') return null
  if (Date.now() - parsed.t > PKCE_TTL_MS) return null // expired
  return { verifier: parsed.v, state: parsed.s }
}

export const STATE_COOKIE_TTL_MS = PKCE_TTL_MS

// --- Authorize URL ---

// Build the Google authorize URL. The "openid profile email" scopes are the
// minimum to receive a verified email + sub on the id_token; adding more
// would require consent screens we do not need.
export function buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // Prompt=select_account forces the account chooser even for users with
    // a single signed-in account, which avoids the "silent re-auth with the
    // wrong identity" footgun. Without it, an attacker who controls a
    // already-signed-in Chrome profile can quietly land inside the
    // wrong-account flow.
    prompt: 'select_account',
    access_type: 'online', // we do not need a refresh token; the cookie is the session
  })
  return `${AUTH_URL}?${params.toString()}`
}

// --- Token exchange + ID-token verification ---

export async function exchangeCodeForTokens({ code, codeVerifier, clientId, clientSecret, redirectUri }) {
  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: body.toString(),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Google token exchange failed (${response.status}): ${text.slice(0, 200)}`)
  }
  const payload = await response.json()
  if (!payload?.id_token) {
    throw new Error('Google token response did not include an id_token.')
  }
  return payload
}

export async function verifyGoogleIdToken(idToken, expectedClientId) {
  if (typeof idToken !== 'string' || !idToken) {
    throw new Error('Google credential is missing.')
  }
  // jose's jwtVerify handles JWKS fetch + signature check + standard claim
  // checks (exp, nbf, iat) for us. We layer on the audience, issuer, and
  // email_verified checks that tokeninfo-based flow used to do explicitly.
  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer: [...ALLOWED_ISSUERS],
    audience: expectedClientId,
  })

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Google credential is missing a subject identifier.')
  }
  if (payload.email_verified !== true) {
    throw new Error('Google email is not verified.')
  }
  if (typeof payload.email !== 'string' || !payload.email) {
    throw new Error('Google credential is missing an email address.')
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: true,
    name: typeof payload.name === 'string' ? payload.name : null,
    picture: typeof payload.picture === 'string' ? payload.picture : null,
  }
}

// Build the post-callback landing URL on the SPA. The browser will land on
// this with the session cookie set; the SPA does not need to parse any
// token out of the URL — the cookie is the session, same as password login.
export function buildClientRedirect({ clientOrigin, role, error, needsProfileCompletion }) {
  const base = clientOrigin || 'http://localhost:5173'
  if (error) {
    const params = new URLSearchParams({ error })
    return `${base}/student/login?google=error&${params.toString()}`
  }
  // Map server role back to the SPA dashboard route. Landlords / admins
  // signing in via Google is rejected server-side, so this is student-only,
  // but we still branch defensively.
  if (role === 'landlord') return `${base}/landlord/dashboard${needsProfileCompletion ? '?complete=1' : ''}`
  if (role === 'admin') return `${base}/admin/dashboard`
  return `${base}/student/dashboard${needsProfileCompletion ? '?complete=1' : ''}`
}
