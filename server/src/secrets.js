// Guards against deploying with a weak or placeholder secret. The length check
// alone is not enough: the values in .env.example are long enough to pass it, so
// an operator who copies the example and forgets to rotate would ship a secret
// that is public in the repo. This rejects known placeholder patterns and values
// with too little entropy (few distinct characters = not random).

const PLACEHOLDER_PATTERN = /replace|change[_-]?me|example|placeholder|your[_-]?secret|dummy|default|123456|abcdef|xxxx|secret[_-]?here|generate[_-]?me/i

export const isWeakSecret = (secret = '') =>
  PLACEHOLDER_PATTERN.test(secret) || new Set(secret).size < 12

export function assertStrongSecret(name) {
  const value = process.env[name]
  if (!value || value.length < 32) {
    throw new Error(`${name} must be at least 32 characters.`)
  }
  if (isWeakSecret(value)) {
    throw new Error(`${name} looks like a placeholder or low-entropy value. Generate a real one, e.g. "openssl rand -hex 32".`)
  }
}
