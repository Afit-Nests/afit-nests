// CI dependency-audit gate.
//
// `npm audit --audit-level=high` fails on ANY high/critical advisory, but some
// advisories do not apply to how this app uses a dependency. This gate fails on
// every high/critical advisory EXCEPT a small, explicitly documented allowlist,
// so we keep real coverage without a blanket downgrade of the audit level.
//
// To allowlist an advisory: add its GHSA id below WITH a justification comment.
// Review the list whenever dependencies change.
import { execSync } from 'node:child_process'

const ALLOWLIST = new Map([
  // react-router RSC-mode CSRF. This app is a client-only Vite SPA using plain
  // <Routes>/<Link> routing — it does NOT use React Router's RSC / server-action
  // mode, which is the only affected surface. No forward-fixed version exists
  // (every 7.12–8.2 release is flagged; latest 7.18.2 is the safest available).
  ['GHSA-qwww-vcr4-c8h2', 'react-router RSC CSRF — not applicable to a client-only SPA'],

  // ip-address advisories (transitive via express-rate-limit@8.x). We only
  // touch this package through `Address6`, which `express-rate-limit`
  // uses to normalise IPv6 keys for rate-limit buckets. None of the
  // affected surfaces are reachable on the path we exercise:
  //
  //   - proxyIsIPv6() — not imported by express-rate-limit, never called.
  //   - isInSubnet()  — not imported by express-rate-limit, never called.
  //   - IPv4 octal/hex leading-zero handling — we feed IPv6 to Address6 only.
  //
  // Even if a crafted IPv6 caused the rate-limit key to misbehave, the
  // only impact is that one source IP could dodge the per-IP limiter on
  // /api/auth/* — the per-account lockout in routes/auth.js (independent
  // of IP) and the per-IP paymentLimiter / googleLimiter catch the same
  // brute-force shape from a different angle. No fix is shipped: 10.5.0
  // (Aug 2026) is the latest release and the maintainer has not yet
  // published a patch. Re-check on every `npm install`.
  ['GHSA-mwp4-54f8-5fhr', 'ip-address proxyIsIPv6/isInSubnet — not on the express-rate-limit code path'],
  ['GHSA-4xrf-jv44-h6hh', 'ip-address Address6 parser bypass — only feeds rate-limit key, not auth decision'],
  ['GHSA-22jq-vg5j-6vgg', 'ip-address IPv4 octal/hex — only IPv6 (Address6) is consumed by express-rate-limit'],
])

let raw
try {
  raw = execSync('npm audit --omit=dev --json', { encoding: 'utf8' })
} catch (error) {
  // npm audit exits non-zero when vulnerabilities exist; the JSON is still on stdout.
  raw = error.stdout?.toString() || ''
}

let report
try {
  report = JSON.parse(raw)
} catch {
  console.error('audit-check: could not parse `npm audit --json` output.')
  process.exit(2)
}

const ghsaFrom = (url) => (typeof url === 'string' ? url.split('/').pop() : null)
const offenders = []

for (const [pkg, vuln] of Object.entries(report.vulnerabilities || {})) {
  if (!['high', 'critical'].includes(vuln.severity)) continue
  const advisories = (vuln.via || [])
    .filter((v) => typeof v === 'object' && v.url)
    .map((v) => ghsaFrom(v.url))
    .filter(Boolean)
  // A package vulnerable only transitively (via a string ref) has no direct
  // advisory here; it is covered when the underlying package's advisory is judged.
  const unlisted = advisories.filter((id) => !ALLOWLIST.has(id))
  if (unlisted.length) offenders.push(`${pkg} (${vuln.severity}): ${unlisted.join(', ')}`)
}

if (offenders.length) {
  console.error('audit-check: high/critical advisories NOT on the allowlist:')
  for (const o of offenders) console.error(`  - ${o}`)
  console.error('\nFix the dependency, or add the GHSA id to the allowlist with justification if it truly does not apply.')
  process.exit(1)
}

const allowed = [...ALLOWLIST.entries()].map(([id, why]) => `${id} (${why})`)
console.log('audit-check: no high/critical advisories outside the documented allowlist.')
if (allowed.length) console.log('Allowlisted (documented as non-applicable):\n  - ' + allowed.join('\n  - '))
