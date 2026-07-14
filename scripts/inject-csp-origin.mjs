// Replaces the `API_ORIGIN` placeholder in the built dist/_headers CSP with the real
// backend origin derived from VITE_API_BASE_URL (the same env var the app calls). This
// keeps the deployed Content-Security-Policy connect-src in sync with the API host
// without hardcoding an environment-specific origin in source control.
//
// Runs automatically after `vite build`. If VITE_API_BASE_URL is not set, the bare
// placeholder is stripped (leaving a valid CSP that allows only 'self' + Paystack) and
// a warning is printed so a misconfigured deploy is obvious rather than silently broken.
import fs from 'fs/promises'
import path from 'path'

const headersPath = path.resolve(process.cwd(), 'dist', '_headers')
const apiBaseUrl = process.env.VITE_API_BASE_URL

let contents
try {
  contents = await fs.readFile(headersPath, 'utf8')
} catch {
  console.warn('[inject-csp-origin] dist/_headers not found; skipping.')
  process.exit(0)
}

if (!contents.includes('API_ORIGIN')) {
  console.log('[inject-csp-origin] No API_ORIGIN placeholder present; nothing to do.')
  process.exit(0)
}

let replacement = ''
if (apiBaseUrl) {
  try {
    replacement = new URL(apiBaseUrl).origin
  } catch {
    console.warn(`[inject-csp-origin] VITE_API_BASE_URL is not a valid URL: "${apiBaseUrl}". Stripping placeholder.`)
  }
}

// Replace " API_ORIGIN" (with its leading space) so removing it leaves a clean list.
const updated = contents.replace(/\s*API_ORIGIN/g, replacement ? ` ${replacement}` : '')
await fs.writeFile(headersPath, updated, 'utf8')

if (replacement) {
  console.log(`[inject-csp-origin] CSP connect-src backend origin set to ${replacement}.`)
} else {
  console.warn('[inject-csp-origin] VITE_API_BASE_URL not set: CSP connect-src will only allow \'self\' and Paystack. API calls to a different origin will be blocked.')
}
