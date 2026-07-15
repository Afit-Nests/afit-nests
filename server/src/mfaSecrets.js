import crypto from 'crypto'

const PREFIX = 'enc:v1:'

function getEncryptionKey() {
  const value = process.env.TOTP_SECRET_ENCRYPTION_KEY
  if (!value) return null

  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, 'hex')
  const base64 = Buffer.from(value, 'base64')
  if (base64.length === 32) return base64

  throw new Error('TOTP_SECRET_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters or base64.')
}

export function protectTotpSecret(secret) {
  const key = getEncryptionKey()
  if (!secret || !key) return secret

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`
}

export function unprotectTotpSecret(value) {
  if (!value || !String(value).startsWith(PREFIX)) return value

  const key = getEncryptionKey()
  if (!key) throw new Error('TOTP_SECRET_ENCRYPTION_KEY is required to decrypt MFA secrets.')

  const packed = Buffer.from(String(value).slice(PREFIX.length), 'base64')
  const iv = packed.subarray(0, 12)
  const tag = packed.subarray(12, 28)
  const encrypted = packed.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function adminMfaRequired() {
  if (process.env.REQUIRE_ADMIN_MFA === 'true') return true
  if (process.env.REQUIRE_ADMIN_MFA === 'false') return false
  return process.env.NODE_ENV === 'production'
}
