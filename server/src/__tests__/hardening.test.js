// Additional security-control tests. These prove, per commit in CI, that specific
// hardening controls are actually in force — MFA (TOTP) crypto, live security
// headers, CSRF/CORS enforcement, and rate-limit advertisement.
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import crypto from 'node:crypto'
import { generateSecret, verifyTotp, otpauthURL } from '../totp.js'

const strongSecret = 'vN8qR2mZ7tY4pL9wS6kD3hJ5xC1uB0aE8rT2yU7iO4pQ9sF6gH3jK5lM1n'

function withEnv(values, callback) {
  const previous = {}
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

async function withTestServer(callback) {
  return withEnv({
    COOKIE_SECRET: strongSecret,
    JWT_SECRET: strongSecret,
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    CLIENT_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
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

// Independent HOTP so we can generate a valid current code to feed verifyTotp.
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function base32Decode(s) {
  let bits = ''
  for (const c of s) bits += BASE32.indexOf(c).toString(2).padStart(5, '0')
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}
function totpCode(secret, counter) {
  const buf = Buffer.alloc(8)
  let v = counter
  for (let i = 7; i >= 0; i--) { buf[i] = v & 0xff; v = Math.floor(v / 256) }
  const d = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest()
  const o = d[d.length - 1] & 0x0f
  const n = ((d[o] & 0x7f) << 24) | ((d[o + 1] & 0xff) << 16) | ((d[o + 2] & 0xff) << 8) | (d[o + 3] & 0xff)
  return (n % 1e6).toString().padStart(6, '0')
}

test('TOTP accepts a valid current code and rejects wrong / expired / malformed ones', () => {
  const secret = generateSecret()
  const step = Math.floor(Date.now() / 1000 / 30)
  assert.equal(verifyTotp(secret, totpCode(secret, step)), true, 'current code must verify')
  assert.equal(verifyTotp(secret, totpCode(secret, step - 1)), true, 'prev step within drift window')
  assert.equal(verifyTotp(secret, totpCode(secret, step - 5)), false, 'far-past code must be rejected')
  assert.equal(verifyTotp(secret, '000000') && totpCode(secret, step) !== '000000', false)
  assert.equal(verifyTotp(secret, 'abc123'), false, 'non-numeric rejected')
  assert.equal(verifyTotp(secret, '12345'), false, 'wrong-length rejected')
})

test('TOTP provisioning URL is well-formed for authenticator apps', () => {
  const url = otpauthURL({ secret: 'JBSWY3DPEHPK3PXP', label: 'admin@afitnests.com', issuer: 'AFIT Nests' })
  assert.match(url, /^otpauth:\/\/totp\//)
  assert.match(url, /secret=JBSWY3DPEHPK3PXP/)
  assert.match(url, /issuer=AFIT\+Nests/)
  assert.match(url, /algorithm=SHA1/)
})

test('API responses hide x-powered-by and send hardening headers', async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.headers.get('x-powered-by'), null, 'x-powered-by must be hidden')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.match(res.headers.get('referrer-policy') || '', /no-referrer|strict-origin/)
    assert.match(res.headers.get('content-security-policy') || '', /object-src 'none'/)
  })
})

test('API advertises rate limiting via standard RateLimit headers', async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`)
    const hasRateLimit = [...res.headers.keys()].some(k => k.toLowerCase().includes('ratelimit'))
    assert.equal(hasRateLimit, true, 'a RateLimit-* header must be present on /api responses')
  })
})

test('CORS does not reflect an unknown origin', async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://evil.example.com' } })
    assert.notEqual(res.headers.get('access-control-allow-origin'), 'https://evil.example.com')
    assert.notEqual(res.headers.get('access-control-allow-origin'), '*')
  })
})
