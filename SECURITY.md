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

## 3. Broader standards coverage

The OWASP Top 10 is an awareness list, not a verification standard. This section maps the same
controls to the deeper frameworks a security review expects. This is a **self-assessment** against
these standards, not a certified third-party audit.

### 3.1 OWASP ASVS (Application Security Verification Standard) — Level 1, with Level 2 items

| ASVS chapter | Representative requirements met | Control |
|---|---|---|
| **V2 Authentication** | 2.1 password strength, 2.1.7 breached-password check, 2.2.1 anti-automation, 2.4.1 approved hash, 2.8 MFA | bcrypt-12, HIBP k-anonymity, per-account lockout + backoff, TOTP MFA |
| **V3 Session Management** | 3.2 token generation, 3.3 logout invalidation, 3.4 cookie attributes | HS256 JWT + `session_version` revocation; `HttpOnly`/`Secure`/`SameSite` cookies |
| **V4 Access Control** | 4.1.1 server-side enforcement, 4.1.3 least privilege / deny by default, 4.2.1 IDOR protection | role re-read from DB, per-record ownership scoping |
| **V5 Validation & Encoding** | 5.1 input validation, 5.3.3 output encoding, 5.3.4 parameterized queries, 5.3.6 URL validation | Zod on every route, React escaping, `pg` params + allowlists, `http(s)`-only URLs |
| **V6/V8 Cryptography & Data Protection** | 6.2 approved algorithms, 8.1 sensitive data at rest | bcrypt, AES-256-GCM (TOTP secrets), SHA-256 reset tokens |
| **V7 Error Handling & Logging** | 7.1.1 no sensitive data in logs, 7.4.1 generic error messages | generic prod errors, `audit_logs` |
| **V9 Communications** | 9.1 TLS everywhere, 9.2 HSTS | TLS + HSTS preload at the edge |
| **V10 Malicious Code** | 10.3 dependency integrity | `gitleaks`, dependency-audit gate, pinned deps |
| **V11 Business Logic** | 11.1.1 sequential/atomic flows, 11.1.4 anti-automation | payment amount server-side, `FOR UPDATE` locks, rate limits |
| **V12 Files & Resources** | 12.1 size limits, 12.2 content-type validation, 12.3 path traversal | 5 MB cap, magic-byte + type allowlist (no SVG), path guard + `startsWith(root)` |
| **V13 API & Web Service** | 13.2.3 CSRF, 13.1 JSON validation | double-submit CSRF, Zod, CORS allowlist |
| **V14 Configuration** | 14.3 no debug/default creds in prod, 14.4 security headers | boot secret guard, prod feature guards, full header set |

### 3.2 OWASP API Security Top 10 (2023) — this is an API-first app

| ID | Risk | Status |
|---|---|---|
| API1 | Broken Object Level Auth (BOLA) | ✅ ownership scoped by `req.user.id` |
| API2 | Broken Authentication | ✅ MFA, lockout, strong sessions |
| API3 | Broken Object Property Level Auth | ✅ Zod strips unknown keys; `verified`/`role` self-set blocked |
| API4 | Unrestricted Resource Consumption | ✅ rate limits, 200 KB body cap, `LIMIT`≤200 |
| API5 | Broken Function Level Auth (BFLA) | ✅ `requireRole` on privileged routes |
| API6 | Unrestricted Access to Sensitive Flows | ✅ dedicated payment-init limiter, atomic ops |
| API7 | SSRF | ✅ no user-controlled outbound URLs |
| API8 | Security Misconfiguration | ✅ headers, secret guard, prod guards |
| API9 | Improper Inventory Management | ◑ routes documented; staging is isolated from prod |
| API10 | Unsafe Consumption of 3rd-party APIs | ✅ Paystack re-verified server-side + webhook HMAC |

### 3.3 CWE mapping (key weaknesses defended)

CWE-89 SQLi → parameterized + allowlists · CWE-79 XSS → React escaping + URL scheme check ·
CWE-352 CSRF → double-submit token · CWE-639/284 IDOR/access → ownership + role checks ·
CWE-307 brute force → lockout + rate limiting · CWE-521/798 weak/hardcoded creds → secret guard + HIBP ·
CWE-256/311 cleartext storage → bcrypt/AES-GCM/TLS · CWE-22 path traversal → upload path guard ·
CWE-434 unrestricted upload → magic-byte + type allowlist · CWE-1021 clickjacking → `frame-ancestors`/XFO ·
CWE-345 insufficient verification → webhook HMAC + payment re-verify.

### 3.4 PCI-DSS relevant requirements (payments in scope)

- **Req 3** — no PAN stored; Paystack tokenization keeps card data off our servers.
- **Req 4** — cardholder-adjacent data in transit protected by TLS.
- **Req 6.2.4 / 6.3** — OWASP-aligned secure coding; dependency management via the audit gate.
- **Req 8** — strong authentication; **MFA enforced for administrative access**.
- **Req 10** — audit logging of security-relevant actions.
- **Req 11.3** — penetration testing: an isolated staging target + a WSTG-style test plan
  (`PENTEST_PACKAGE.md`) are provided for periodic testing.

---

## 4. Automated evidence (this is the proof)

Run locally: `npm test` · `npm run lint` · `node scripts/audit-check.mjs`

CI runs on every push to `master` (`.github/workflows/ci.yml`) and gates on:
- **`verify`** — build + lint + the security test suite + the dependency-audit gate
- **`gitleaks`** — full-history secret scan

The security test suite (`server/src/__tests__/`) exercises the real controls: the weak-secret
guard, MFA encryption + `REQUIRE_ADMIN_MFA`, TOTP verification, security headers on live responses,
CSRF enforcement before any DB work, CORS origin rejection, and Paystack webhook-signature rejection.
A green CI run is a per-commit attestation that these controls are in force.

---

## 5. Deployment security requirements (operational)

These are **not** in code and must be enforced by operators:
1. Rotate `JWT_SECRET`, `COOKIE_SECRET`, DB password, and Paystack secret key — and rotate again
   if any secret was ever exposed (e.g. in a public repo or chat).
2. Set `TOTP_SECRET_ENCRYPTION_KEY` (32 bytes hex/base64) so MFA secrets are encrypted at rest.
3. `REQUIRE_ADMIN_MFA=true`, `ALLOW_DEV_RESET_URL=false`, `ALLOW_LOCAL_UPLOADS=false` in production.
4. `CLIENT_ORIGIN` set to the exact deployed frontend origin(s) only.
5. Managed database backups enabled with at least one tested restore.
6. Use external object storage (Cloudinary) and Paystack **live** keys only after business verification.

---

## 6. Reporting a vulnerability

Please report security issues privately — do **not** open a public issue.

- **Contact:** `security@afitnests.com` (see `/.well-known/security.txt`)
- Include: affected endpoint/flow, reproduction steps, and impact.
- We aim to acknowledge within 72 hours. Please allow reasonable time to remediate before any
  public disclosure. Test only against staging with authorization — never against production data.
