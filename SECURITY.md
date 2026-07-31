# Security Policy & Controls — AFIT Nests

AFIT Nests handles student/landlord PII and processes real payments (Paystack), so it is
treated as a security-sensitive application. This document is the authoritative inventory of
the controls that are actually implemented in this repository, the threats they address, and
the automated evidence that proves they work. Every claim below maps to real code — file paths
are given so it can be independently verified.

Last reviewed: 2026-07-31 · Framework alignment: **OWASP Top 10 (2025)** + PCI-DSS-relevant payment controls.

---

## 1. Security posture at a glance

- **Defence in depth** — no single control is trusted; auth, input validation, output encoding,
  transport, and secrets each have independent controls.
- **Server is the trust boundary** — every price, status, role, and permission is validated or
  recomputed server-side. The client is never trusted.
- **Fail closed** — missing/weak secrets, unverified payments, and unknown origins are rejected,
  not waved through.
- **Provable** — controls are backed by an automated security test suite (`server/src/__tests__/`)
  that runs in CI on every push, plus `gitleaks` secret scanning and a dependency-audit gate.

---

## 2. Controls inventory (mapped to OWASP Top 10 2025)

### A01 Broken Access Control
- **Authenticated ownership checks** on every record access — messages, chats, viewings,
  notifications, saved listings, payments are all scoped to `req.user.id` server-side
  (`server/src/routes/data.js`, `engagement.js`).
- **Role enforcement** via `requireRole(...)` middleware on privileged routes; the role is
  **re-read from the database** in `requireAuth` (`server/src/auth.js`), never trusted from the token.
- **No privilege escalation** — landlords cannot self-publish or self-verify; listing status
  transitions are admin-gated.
- **No SSRF** — the only outbound request is to Paystack with a hard-coded base URL and a
  URL-encoded reference; no user-controlled URLs are fetched server-side.

### A02 Cryptographic Failures
- Passwords hashed with **bcrypt cost 12** (`routes/auth.js`); DB constraint enforces hash length.
- Sessions are **HS256 JWTs** with enforced ≥32-char high-entropy secret, `issuer` verification,
  and a `session_version` revocation mechanism (logout / password reset invalidate old tokens).
- **TOTP MFA secrets encrypted at rest** with AES-256-GCM (`server/src/mfaSecrets.js`).
- TLS + **HSTS with preload** enforced at the edge; password-reset tokens are SHA-256-hashed,
  single-use, and expire in 1 hour.

### A03 Injection
- **All SQL is parameterized** (`pg`); the generic data endpoint uses table/column **allowlists**
  and a validated numeric `LIMIT` (`routes/data.js`).
- **Zod schema validation** on every route and every write path.
- **XSS**: React auto-escaping throughout; no `dangerouslySetInnerHTML` on user content.
  User-supplied photo URLs are constrained to `http(s)` (no `javascript:`/`data:`).

### A04 Insecure Design (business logic)
- Payment **amount is snapshotted server-side** at initialization; the client only sends a
  `listingId`. Verification re-checks amount/currency/status/reference with Paystack.
- Reviews require a landlord-confirmed viewing; double-allocation and refund-more-than-paid are
  prevented by `FOR UPDATE` row locks + status guards (`routes/payments.js`).

### A05 Security Misconfiguration
- **Boot-time secret guard** (`server/src/secrets.js`) refuses to start on placeholder or
  low-entropy `JWT_SECRET`/`COOKIE_SECRET` — the example-file trap is closed.
- `helmet` sets CSP, `frame-ancestors 'none'`, `nosniff`, and hides `x-powered-by` on the API.
- Frontend ships its **own** header set (`vercel.json` / `public/_headers`): CSP, HSTS+preload,
  `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, `Referrer-Policy`, `Permissions-Policy`.
- Dev-only conveniences (reset-URL echo, default seed accounts) are **blocked in production** at boot.

### A06 Software Supply Chain
- **`gitleaks`** secret scanning in CI (`.github/workflows/secret-scan.yml`) on every push/PR.
- **Dependency-audit gate** (`scripts/audit-check.mjs`) fails CI on any high/critical advisory
  except a small, documented, non-applicable allowlist — no blanket audit-level downgrade.
- Runtime dependencies are pinned to exact versions.

### A07 Authentication & Session Failures
- **Mandatory admin MFA (TOTP / RFC 6238)** — admins cannot sign in without a second factor.
- **Per-account lockout with capped exponential backoff** *in addition to* per-IP rate limiting;
  identical responses for wrong-password vs locked (non-enumerable); wrong MFA codes count toward
  lockout; the lock is DoS-bounded (locked attempts don't extend it).
- **Breached-password rejection** via the Have I Been Pwned range API using **k-anonymity**
  (only a SHA-1 prefix leaves the server — `server/src/breachedPasswords.js`).
- **Constant-time login** — a dummy bcrypt compare runs on the no-account path; forgot-password is
  constant-response — so neither leaks whether an account exists.

### A08 Data Integrity / Webhooks
- Paystack webhooks verified with **HMAC-SHA512 + `timingSafeEqual`**; unsigned/forged requests
  are rejected with 401 (`routes/payments.js`). Payment state is idempotent.

### A09 Logging & Monitoring
- Sensitive actions written to an **audit log** (`audit_logs`); production errors return generic
  messages (no stack traces or internal detail leaked to clients).

### A10 Mishandling Exceptional Conditions
- Malformed input returns clean `400`s; the app **fails closed** on error rather than granting access.

---

## 3. Automated evidence (this is the proof)

Run locally: `npm test` · `npm run lint` · `node scripts/audit-check.mjs`

CI runs on every push to `master` (`.github/workflows/ci.yml`) and gates on:
- **`verify`** — build + lint + the security test suite + the dependency-audit gate
- **`gitleaks`** — full-history secret scan

The security test suite (`server/src/__tests__/`) exercises the real controls: the weak-secret
guard, MFA encryption + `REQUIRE_ADMIN_MFA`, TOTP verification, security headers on live responses,
CSRF enforcement before any DB work, CORS origin rejection, and Paystack webhook-signature rejection.
A green CI run is a per-commit attestation that these controls are in force.

---

## 4. Deployment security requirements (operational)

These are **not** in code and must be enforced by operators:
1. Rotate `JWT_SECRET`, `COOKIE_SECRET`, DB password, and Paystack secret key — and rotate again
   if any secret was ever exposed (e.g. in a public repo or chat).
2. Set `TOTP_SECRET_ENCRYPTION_KEY` (32 bytes hex/base64) so MFA secrets are encrypted at rest.
3. `REQUIRE_ADMIN_MFA=true`, `ALLOW_DEV_RESET_URL=false`, `ALLOW_LOCAL_UPLOADS=false` in production.
4. `CLIENT_ORIGIN` set to the exact deployed frontend origin(s) only.
5. Managed database backups enabled with at least one tested restore.
6. Use external object storage (Cloudinary) and Paystack **live** keys only after business verification.

---

## 5. Reporting a vulnerability

Please report security issues privately — do **not** open a public issue.

- **Contact:** `security@afitnests.com` (see `/.well-known/security.txt`)
- Include: affected endpoint/flow, reproduction steps, and impact.
- We aim to acknowledge within 72 hours. Please allow reasonable time to remediate before any
  public disclosure. Test only against staging with authorization — never against production data.
