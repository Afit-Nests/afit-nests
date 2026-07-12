# SECURITY_HEADERS Fix Plan

## Changes

- No code changes required after review.

## New files

- `security/reports/SECURITY_HEADERS_REPORT.md`
- `security/plans/SECURITY_HEADERS_PLAN.md`

## Verification goals

- [x] Headers are configured in global middleware.
- [x] CSP is present.
- [x] Helmet is applied before routes.

## Manual verification (for the human)

- Run `curl -I https://your-backend-host/api/health` and confirm CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.
