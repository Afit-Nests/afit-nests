// RFC 6238 TOTP + RFC 4648 base32, implemented on Node's built-in crypto so we add
// no third-party dependency (and no new supply-chain surface) for MFA. Compatible
// with Google Authenticator, Authy, 1Password, etc. (SHA-1, 6 digits, 30s period).
import crypto from 'crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const DIGITS = 6
const PERIOD = 30

export function generateSecret(bytes = 20) {
  const buffer = crypto.randomBytes(bytes)
  let bits = ''
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0')
  let secret = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)]
  }
  return secret
}

function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = ''
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret.')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function hotp(secret, counter) {
  const key = base32Decode(secret)
  const counterBuffer = Buffer.alloc(8)
  // Big-endian 64-bit counter. Bit-shifts overflow past 32 bits, so use division.
  let value = counter
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = value & 0xff
    value = Math.floor(value / 256)
  }
  const digest = crypto.createHmac('sha1', key).update(counterBuffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

// Verify a submitted code against the secret, allowing +/- `window` steps for clock
// drift. Constant-ish: compares against each candidate with timingSafeEqual.
export function verifyTotp(secret, token, window = 1) {
  if (!secret || typeof token !== 'string' || !/^\d{6}$/.test(token)) return false
  const counter = Math.floor(Date.now() / 1000 / PERIOD)
  for (let error = -window; error <= window; error++) {
    let candidate
    try {
      candidate = hotp(secret, counter + error)
    } catch {
      return false
    }
    const a = Buffer.from(candidate)
    const b = Buffer.from(token)
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true
  }
  return false
}

export function otpauthURL({ secret, label, issuer }) {
  const encodedLabel = encodeURIComponent(`${issuer}:${label}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  })
  return `otpauth://totp/${encodedLabel}?${params.toString()}`
}
