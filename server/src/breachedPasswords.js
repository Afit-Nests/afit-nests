import crypto from 'crypto'

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/'
const REQUEST_TIMEOUT_MS = 3000

const disabled = () => process.env.DISABLE_BREACHED_PASSWORD_CHECK === 'true'

const sha1 = (value) => crypto
  .createHash('sha1')
  .update(value, 'utf8')
  .digest('hex')
  .toUpperCase()

async function fetchBreachedSuffixes(prefix) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      signal: controller.signal,
      headers: {
        'Add-Padding': 'true',
        'User-Agent': 'AFIT-Nests-Password-Check',
      },
    })

    if (!response.ok) throw new Error(`Breached password range check failed with ${response.status}`)
    return response.text()
  } finally {
    clearTimeout(timeout)
  }
}

export async function isBreachedPassword(password) {
  if (!password || disabled()) return false

  const digest = sha1(password)
  const prefix = digest.slice(0, 5)
  const suffix = digest.slice(5)
  const body = await fetchBreachedSuffixes(prefix)

  return body
    .split('\n')
    .some((line) => line.trim().split(':')[0] === suffix)
}

export async function assertPasswordNotBreached(password) {
  if (disabled()) return

  let breached = false
  try {
    breached = await isBreachedPassword(password)
  } catch (error) {
    // Do not block account recovery or signup if the external range API is unavailable.
    console.warn(`Breached password check skipped: ${error.message}`)
    return
  }

  if (breached) {
    const error = new Error('This password appears in known data breaches. Choose a different password.')
    error.status = 400
    throw error
  }
}
