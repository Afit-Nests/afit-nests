# AFIT Nests Security Checklist and Actions

Date: 2026-07-12

This document records the security checklist items reviewed for AFIT Nests and the actions already carried out in the repository. It is intended as a plain operational record for future deployment and maintenance.

## Summary

No critical code-level security issues are currently known after the latest hardening pass.

Important deployment actions remain:

- Rotate every secret that ever appeared in old `.env` history.
- Use external object storage for production uploads.
- Enable and test managed PostgreSQL backups.
- Verify deployed HTTPS, CORS, headers, and rate limiting in the live environment.

## Checklist Actions

| # | Security checklist item | Status | Actions carried out |
|---|---|---|---|
| 1 | API keys are not in frontend code | Done | Kept database credentials, JWT secrets, cookie secrets, and Paystack secret key server-side. Frontend env is limited to browser-safe values such as `VITE_API_BASE_URL`. |
| 2 | Database queries are not running in the browser | Done | PostgreSQL access goes through the Express backend API. The React app uses API routes and does not connect directly to PostgreSQL. |
| 3 | Authentication actually works | Done | Added HttpOnly cookie sessions, JWT expiry, backend auth middleware, and `session_version` invalidation so logout/password reset invalidate copied old tokens. |
| 4 | No sensitive data in URLs / broken access control | Done | Server-side ownership and role checks added for admin, landlord, student, listing, upload, payment, message, review, and viewing flows. |
| 5 | File uploads validated and restricted | Done with deployment action | Uploads require auth, allowed buckets, allowed MIME types, 5 MB limit, and image magic-byte checks. Production local uploads fail closed unless explicitly enabled. External object storage is still required for real production reliability. |
| 6 | Server-side input validation | Done | Zod schemas validate auth, listings, admin actions, payments, reviews, availability, uploads, password reset, and compatibility data routes. |
| 7 | SQL injection protection | Done | SQL calls use parameterized `pg` queries. Dynamic order/table usage is restricted through allowlists. |
| 8 | XSS prevention | Done | React JSX escaping is used. No dangerous HTML rendering was introduced for user-generated content. User content remains plain text. |
| 9 | Rate limiting on authentication endpoints | Done | Login, registration, and password reset endpoints use auth rate limiting. General API rate limiting is enabled. |
| 10 | CORS is not set to allow everything | Done | CORS uses explicit `CLIENT_ORIGIN` allowlist and credentials support. No wildcard CORS policy is used. |
| 11 | Passwords are hashed, not plaintext | Done | Passwords are stored as bcrypt hashes with cost 12. Password hashes have a database length constraint. |
| 12 | Error messages do not leak internal details | Done | Production server errors return generic messages. Production validation responses avoid detailed Zod internals. |
| 13 | Dependencies are not wildly outdated/vulnerable | Done | Ran `npm audit --omit=dev`; result was 0 vulnerabilities. |
| 14 | Payment logic runs server-side | Done | Payment initialization uses server-side listing price. Client only sends `listingId`. Paystack verification runs server-side before marking payments verified. |
| 15 | Admin routes have server-side role checks | Done | Admin routes use backend `requireAuth` and `requireRole('admin')`. UI hiding is not relied on for security. |
| 16 | HTTPS is enforced everywhere | Deployment action | Code expects production origins and secure cookies under `NODE_ENV=production`. Final HTTPS redirect/enforcement must be configured on the production hosts/CDN. |
| 17 | Security headers are set | Done | Helmet is configured with CSP, frame restrictions, content type protections, and related defaults. Live headers should be verified after deployment. |
| 18 | Session tokens are secure | Done | Session cookies are HttpOnly, SameSite Lax, Secure in production, path-scoped, and expire after 24 hours. Session version invalidates old copied JWTs. |
| 19 | Logging does not include sensitive data | Done | Removed frontend upload result logging. No request-body password logging was added. Server logs only startup/server errors. |
| 20 | Database backups exist | Deployment action | Documentation now requires managed PostgreSQL backups and at least one restore test. This must be configured in the database provider. |
| 21 | Environment variables are not committed to Git | Done with required secret rotation | `.env` and `server/.env` are ignored. Old `.env` history was removed from `master` through history rewrite and force push. Any previously exposed secrets must still be rotated. |
| 22 | Third-party integrations use least privilege | Deployment action | Paystack secret remains server-side. Production operators must ensure real keys are scoped appropriately and stored only in backend host environment variables. |
| 23 | Webhook endpoints verify signatures | Done | Paystack webhook route verifies `x-paystack-signature` with HMAC SHA-512 using the Paystack secret key. Unsigned/tampered requests are rejected. |
| 24 | User data deletion works | Done | Added `DELETE /api/auth/me` and `DELETE /api/admin/users/:id`. Accounts are deleted where safe or anonymized where financial records must remain consistent. |
| 25 | Tested as an attacker | Partly done | Code-level checks, secret/history checks, build, syntax checks, and dependency audit were performed. Live attacker-style testing must still be done after deployment with real domains and accounts. |

## Product Reliability and Safety Features Added

- Listing approval workflow with `pending_review`, `rejected`, `available`, `pending_confirmation`, and `occupied`.
- Notifications table and API.
- Audit logs for important platform actions.
- Saved listings.
- Reviews restricted to students with confirmed/completed viewings.
- Listing availability records.
- Refund tracking records for rejected paid allocations.
- Admin CMS visibility for listing reviews, refunds, reviews, and audit logs.

## Verification Already Run

- `npm.cmd run build` passed.
- `npm.cmd audit --omit=dev` passed with 0 vulnerabilities.
- Backend route syntax checks passed with `node --check`.
- `git diff --check` passed with only Windows line-ending warnings.
- `git log --all --full-history -- .env server/.env` returned no entries after history rewrite.
- GitHub `master` was verified at commit `316cfd579fc154a71d7626ee176a098647101ca9` after history cleanup.

## Required Before Real Users

1. Rotate all secrets that ever existed in old `.env` files.
2. Run `server/sql/001_schema.sql` for a new database, or `server/sql/002_product_features.sql` for an existing database.
3. Configure backend-only production environment variables.
4. Configure HTTPS for frontend and backend.
5. Configure `CLIENT_ORIGIN` to the exact frontend origin.
6. Configure Paystack webhook URL:

```text
https://your-backend-domain/api/payments/paystack/webhook
```

7. Use external object storage for listing and avatar uploads.
8. Enable managed PostgreSQL backups and test restore.
9. Verify deployed headers, CORS denial for unknown origins, and auth rate limiting.
10. Test with multiple user roles and try direct API calls as student, landlord, admin, and logged-out user.

## Related Documentation

- Root project guide: `README.md`
- Backend guide: `server/README.md`
- Audit summary: `security/AUDIT_SUMMARY.md`
- Detailed reports: `security/reports/`
- Remediation plans: `security/plans/`
