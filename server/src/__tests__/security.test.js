import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import crypto from 'node:crypto'
import { isComplexPassword } from '../passwordPolicy.js'
import { assertStrongSecret, isWeakSecret } from '../secrets.js'
import { adminMfaRequired, protectTotpSecret, unprotectTotpSecret } from '../mfaSecrets.js'

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

test('password policy allows 8 character complex passwords and rejects weak values', () => {
  assert.equal(isComplexPassword('Aa1!aaaa'), true)
  assert.equal(isComplexPassword('Aa1!aaa'), false)
  assert.equal(isComplexPassword('abcdefgh'), false)
  assert.equal(isComplexPassword('ABCDEFGH1!'), false)
  assert.equal(isComplexPassword('Aa1! aaa'), false)
})

test('deployment secrets reject placeholders and low entropy values', () => {
  assert.equal(isWeakSecret('GENERATE_ME_openssl_rand_hex_32'), true)
  assert.equal(isWeakSecret('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), true)
  assert.equal(isWeakSecret(strongSecret), false)

  withEnv({ COOKIE_SECRET: 'GENERATE_ME_openssl_rand_hex_32_replace_this_value' }, () => {
    assert.throws(() => assertStrongSecret('COOKIE_SECRET'), /placeholder|low-entropy/)
  })

  withEnv({ COOKIE_SECRET: strongSecret }, () => {
    assert.doesNotThrow(() => assertStrongSecret('COOKIE_SECRET'))
  })
})

test('MFA secrets can be encrypted and require admin MFA by default in production', () => {
  const key = crypto.randomBytes(32).toString('hex')
  withEnv({ TOTP_SECRET_ENCRYPTION_KEY: key, NODE_ENV: 'production', REQUIRE_ADMIN_MFA: undefined }, () => {
    const encrypted = protectTotpSecret('JBSWY3DPEHPK3PXP')

    assert.match(encrypted, /^enc:v1:/)
    assert.equal(unprotectTotpSecret(encrypted), 'JBSWY3DPEHPK3PXP')
    assert.equal(adminMfaRequired(), true)
  })

  withEnv({ NODE_ENV: 'production', REQUIRE_ADMIN_MFA: 'false' }, () => {
    assert.equal(adminMfaRequired(), false)
  })
})

test('health endpoint sends security headers and CSRF cookie', async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(body, { ok: true, service: 'afit-nests-backend' })
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/)
    assert.match(response.headers.get('x-frame-options'), /SAMEORIGIN/)
    assert.match(response.headers.get('set-cookie'), /afit_nests_csrf=/)
  })
})

test('unsafe API requests without CSRF token are blocked before auth/database work', async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'Aa1!aaaa' }),
    })
    const body = await response.json()

    assert.equal(response.status, 403)
    assert.equal(body.error, 'Invalid security token. Refresh and try again.')
  })
})

test('signed Paystack webhook route rejects forged webhook requests', async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/paystack/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'charge.success', data: { reference: 'AFIT-TEST-1234' } }),
    })
    const body = await response.json()

    assert.equal(response.status, 401)
    assert.equal(body.error, 'Invalid webhook signature.')
  })
})
