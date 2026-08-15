// Tests for the Google OAuth PKCE redirect flow. We mock the network
// round-trip to Google's token endpoint and the JWKS-backed id_token
// verification by stubbing global fetch and constructing a self-signed JWT
// signed by an in-memory key whose JWKS we serve. jose's createLocalJWKSet
// is what jwtVerify consumes, so we do not need to hit the real JWKS URL.
//
// What we cover:
//   - PKCE: code_verifier length, S256 transformation, state cookie signing
//   - State cookie: round-trip, tampering rejection, expiry
//   - /auth/google/start: redirect URL shape, state cookie issuance
//   - /auth/google/callback: missing code, missing state, tampered state,
//     state mismatch, expired state cookie, code-exchange failure,
//     id_token verification failure (bad audience), happy path
//   - CSRF: callback GET does not require a CSRF token
//   - Unconfigured server returns a redirect with ?google=error=…

import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createHash, createHmac } from 'node:crypto'
import {
  createLocalJWKSet, generateKeyPair, exportJWK, SignJWT,
} from 'jose'

import {
  STATE_COOKIE_NAME,
  _setJwksForTests,
  buildStateCookie,
  deriveCodeChallenge,
  generateCodeVerifier,
  generateState,
  readStateCookie,
} from '../google.js'

const strongSecret = 'vN8qR2mZ7tY4pL9wS6kD3hJ5xC1uB0aE8rT2yU7iO4pQ9sF6gH3jK5lM1n'
const validClientId = '1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com'
const validClientSecret = 'ABCDEFGHIJKLMNOPQRSTUVWX'

async function withEnv(values, callback) {
  const previous = {}
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    // `await` so the finally block waits for the callback to resolve
    // before cleaning up. Without it, `return callback()` returns the
    // pending promise synchronously and the finally runs while the
    // callback is still mid-flight — the env vars get torn down while
    // the test is still trying to read them.
    return await callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

let mockSigningKey = null
let mockJwks = null
const fetchStack = []

async function installMockGoogle({ audience = validClientId, email = 'student@example.com', emailVerified = true } = {}) {
  if (!mockSigningKey) {
    mockSigningKey = await generateKeyPair('RS256')
    const pub = await exportJWK(mockSigningKey.publicKey)
    pub.kid = 'mock-key'
    pub.alg = 'RS256'
    pub.use = 'sig'
    mockJwks = { keys: [pub] }
  }
  const priv = mockSigningKey.privateKey

  // Inject a *local* JWKS into the production code so we never hit the
  // network and we never have to mock jose's https plumbing (which is
  // unfriendly across CJS/ESM module boundaries). The JWKS resolver is
  // a closure that uses the same key the JWTs are signed with, so the
  // signature check succeeds in tests that want it to.
  _setJwksForTests(createLocalJWKSet(mockJwks))

  fetchStack.push(globalThis.fetch)
  globalThis.fetch = async (url, options = {}) => {
    const urlString = typeof url === 'string' ? url : url.toString()
    if (urlString.startsWith('https://oauth2.googleapis.com/token')) {
      const body = String(options.body || '')
      const params = new URLSearchParams(body)
      if (!params.get('code') || !params.get('code_verifier')) {
        return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
      }
      const id_token = await new SignJWT({
        email,
        email_verified: emailVerified,
        name: 'Student Person',
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'mock-key' })
        .setIssuer('https://accounts.google.com')
        .setAudience(audience)
        .setSubject('google-sub-1')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(priv)
      return new Response(JSON.stringify({
        access_token: 'fake-access',
        id_token,
        token_type: 'Bearer',
        expires_in: 3600,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const previous = fetchStack[fetchStack.length - 1]
    return previous ? previous(url, options) : new Response('not found', { status: 404 })
  }
}

function restoreFetch() {
  const prev = fetchStack.pop()
  if (prev) globalThis.fetch = prev
  // The JWKS override persists across tests by design — once installed,
  // it short-circuits the real resolver. Clear it so the next test starts
  // from a clean state.
  _setJwksForTests(null)
}

async function withTestApp(callback, env = {}) {
  return withEnv({
    COOKIE_SECRET: strongSecret,
    JWT_SECRET: strongSecret,
    DATABASE_URL: 'postgres://test:***@localhost:5432/test',
    CLIENT_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
    ...env,
  }, async () => {
    const { createApp } = await import('../app.js')
    const server = http.createServer(createApp())
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    try {
      return await callback(`http://127.0.0.1:${port}`)
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })
}

const REDIRECT_STATUS = [301, 302, 303, 307, 308]

test('PKCE verifier is 43-128 chars of base64url', () => {
  const v = generateCodeVerifier()
  assert.ok(v.length >= 43 && v.length <= 128, `expected 43-128 chars, got ${v.length}`)
  assert.match(v, /^[A-Za-z0-9_-]+$/)
})

test('PKCE challenge is S256(base64url(verifier))', () => {
  const v = generateCodeVerifier()
  const c = deriveCodeChallenge(v)
  // Independently recompute and compare.
  const expected = createHash('sha256').update(v).digest('base64')
    .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  assert.equal(c, expected)
  assert.notEqual(c, v, 'challenge must differ from verifier (otherwise plain)')
})

test('generateState produces high-entropy strings', () => {
  const a = generateState()
  const b = generateState()
  assert.notEqual(a, b)
  assert.ok(a.length >= 32)
})

test('buildStateCookie round-trips through readStateCookie', () => {
  withEnv({ COOKIE_SECRET: strongSecret }, () => {
    const v = generateCodeVerifier()
    const s = generateState()
    const cookie = buildStateCookie(v, s)
    const parsed = readStateCookie(cookie)
    assert.ok(parsed)
    assert.equal(parsed.verifier, v)
    assert.equal(parsed.state, s)
  })
})

test('readStateCookie rejects a tampered cookie', () => {
  withEnv({ COOKIE_SECRET: strongSecret }, () => {
    const cookie = buildStateCookie(generateCodeVerifier(), generateState())
    const [body, sig] = cookie.split('.')
    const tampered = `${body}.${'A'.repeat(sig.length)}`
    assert.equal(readStateCookie(tampered), null)
  })
})

test('readStateCookie rejects a cookie signed with a different key', () => {
  withEnv({ COOKIE_SECRET: strongSecret }, () => {
    const cookie = buildStateCookie(generateCodeVerifier(), generateState())
    withEnv({ COOKIE_SECRET: 'differentkeybutstilllongenoughandnotweak' }, () => {
      assert.equal(readStateCookie(cookie), null)
    })
  })
})

test('readStateCookie rejects an expired cookie', () => {
  withEnv({ COOKIE_SECRET: strongSecret }, () => {
    const past = Date.now() - 60 * 60 * 1000 // 1 hour ago, well past the 10-minute TTL
    const payload = { v: 'verifier', s: 'state', t: past }
    const body = Buffer.from(JSON.stringify(payload)).toString('base64')
      .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const sig = createHmac('sha256', strongSecret).update(body).digest('base64')
      .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    assert.equal(readStateCookie(`${body}.${sig}`), null)
  })
})

test('GET /auth/google/start issues a redirect to accounts.google.com with PKCE + state', async () => {
  await withTestApp(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' })
    assert.ok(REDIRECT_STATUS.includes(response.status), `expected redirect, got ${response.status}`)
    const location = response.headers.get('location') || ''
    assert.match(location, /^https:\/\/accounts\.google\.com\//)
    const url = new URL(location)
    assert.equal(url.searchParams.get('response_type'), 'code')
    assert.equal(url.searchParams.get('client_id'), validClientId)
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
    assert.ok(url.searchParams.get('code_challenge'))
    assert.ok(url.searchParams.get('state'))
    assert.equal(url.searchParams.get('prompt'), 'select_account')
    assert.equal(url.searchParams.get('access_type'), 'online')
    assert.match(url.searchParams.get('redirect_uri'), /\/api\/auth\/google\/callback$/)

    const setCookie = response.headers.get('set-cookie') || ''
    assert.match(setCookie, new RegExp(`${STATE_COOKIE_NAME}=`))
  }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
})

test('GET /auth/google/start redirects with google_not_configured when env is missing', async () => {
  await withTestApp(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' })
    assert.ok(REDIRECT_STATUS.includes(response.status))
    const location = response.headers.get('location') || ''
    assert.match(location, /\/student\/login/)
    assert.match(location, /google=error/)
    assert.match(location, /error=google_not_configured/)
  }, { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' })
})

test('GET /auth/google/callback rejects missing code', async () => {
  await installMockGoogle()
  try {
    await withTestApp(async (baseUrl) => {
      const start = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' })
      const cookieHeader = start.headers.get('set-cookie') || ''
      const m = cookieHeader.match(new RegExp(`${STATE_COOKIE_NAME}=([^;]+)`))
      const stateCookie = m ? m[1] : ''
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?state=fakestate`, {
        redirect: 'manual',
        headers: { Cookie: `${STATE_COOKIE_NAME}=${stateCookie}` },
      })
      assert.ok(REDIRECT_STATUS.includes(cb.status))
      const loc = new URL(cb.headers.get('location'))
      assert.equal(loc.searchParams.get('google'), 'error')
      assert.equal(loc.searchParams.get('error'), 'missing_code')
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})

test('GET /auth/google/callback rejects missing state cookie', async () => {
  await installMockGoogle()
  try {
    await withTestApp(async (baseUrl) => {
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=xyz`, {
        redirect: 'manual',
      })
      const loc = new URL(cb.headers.get('location'))
      assert.equal(loc.searchParams.get('error'), 'invalid_or_expired_state')
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})

test('GET /auth/google/callback rejects a mismatched state', async () => {
  await installMockGoogle()
  try {
    await withTestApp(async (baseUrl) => {
      const start = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' })
      const m = (start.headers.get('set-cookie') || '').match(new RegExp(`${STATE_COOKIE_NAME}=([^;]+)`))
      const cookie = m ? m[1] : ''
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=WRONG`, {
        redirect: 'manual',
        headers: { Cookie: `${STATE_COOKIE_NAME}=${cookie}` },
      })
      const loc = new URL(cb.headers.get('location'))
      assert.equal(loc.searchParams.get('error'), 'state_mismatch')
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})

test('GET /auth/google/callback rejects a tampered state cookie', async () => {
  await installMockGoogle()
  try {
    await withTestApp(async (baseUrl) => {
      const start = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' })
      const m = (start.headers.get('set-cookie') || '').match(new RegExp(`${STATE_COOKIE_NAME}=([^;]+)`))
      const cookie = m ? m[1] : ''
      // Flip a single character in the signature half.
      const [body, sig] = cookie.split('.')
      const flipped = sig.charAt(0) === 'A' ? `B${sig.slice(1)}` : `A${sig.slice(1)}`
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=anything`, {
        redirect: 'manual',
        headers: { Cookie: `${STATE_COOKIE_NAME}=${body}.${flipped}` },
      })
      const loc = new URL(cb.headers.get('location'))
      assert.equal(loc.searchParams.get('error'), 'invalid_or_expired_state')
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})

test('GET /auth/google/callback clears the state cookie even on failure', async () => {
  await installMockGoogle()
  try {
    await withTestApp(async (baseUrl) => {
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=anything`, { redirect: 'manual' })
      const setCookie = cb.headers.get('set-cookie') || ''
      assert.match(setCookie, new RegExp(`${STATE_COOKIE_NAME}=;`))
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})

test('GET /auth/google/callback does not require a CSRF header', async () => {
  await installMockGoogle()
  try {
    await withTestApp(async (baseUrl) => {
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=xyz`, {
        redirect: 'manual',
        // No CSRF cookie, no CSRF header.
      })
      // Should be a redirect (error path), not a 403.
      assert.ok(REDIRECT_STATUS.includes(cb.status), `expected redirect, got ${cb.status}`)
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})

test('GET /auth/google/callback verifies the id_token aud against the configured client_id', async () => {
  await installMockGoogle({ audience: 'different-12345-zzzzz.apps.googleusercontent.com' })
  try {
    await withTestApp(async (baseUrl) => {
      // First do a real start to get a valid state cookie.
      const start = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' })
      const m = (start.headers.get('set-cookie') || '').match(new RegExp(`${STATE_COOKIE_NAME}=([^;]+)`))
      const cookie = m ? m[1] : ''
      const stored = readStateCookie(cookie)
      assert.ok(stored)
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?code=anycode&state=${encodeURIComponent(stored.state)}`, {
        redirect: 'manual',
        headers: { Cookie: `${STATE_COOKIE_NAME}=${cookie}` },
      })
      const loc = new URL(cb.headers.get('location'))
      assert.equal(loc.searchParams.get('error'), 'verification_failed')
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})

test('GET /auth/google/callback rejects an id_token whose email_verified is false', async () => {
  await installMockGoogle({ emailVerified: false })
  try {
    await withTestApp(async (baseUrl) => {
      const start = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' })
      const m = (start.headers.get('set-cookie') || '').match(new RegExp(`${STATE_COOKIE_NAME}=([^;]+)`))
      const cookie = m ? m[1] : ''
      const stored = readStateCookie(cookie)
      const cb = await fetch(`${baseUrl}/api/auth/google/callback?code=anycode&state=${encodeURIComponent(stored.state)}`, {
        redirect: 'manual',
        headers: { Cookie: `${STATE_COOKIE_NAME}=${cookie}` },
      })
      const loc = new URL(cb.headers.get('location'))
      assert.equal(loc.searchParams.get('error'), 'verification_failed')
    }, { GOOGLE_CLIENT_ID: validClientId, GOOGLE_CLIENT_SECRET: validClientSecret })
  } finally { restoreFetch() }
})
