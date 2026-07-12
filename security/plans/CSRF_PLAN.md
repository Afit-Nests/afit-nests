# CSRF Fix Plan

## Changes

- No code changes required after review.

## New files

- `security/reports/CSRF_REPORT.md`
- `security/plans/CSRF_PLAN.md`

## Verification goals

- [x] Session cookies use SameSite=Lax.
- [x] State-changing API methods validate CSRF token.
- [x] Frontend sends `X-CSRF-Token` for unsafe requests.

## Manual verification (for the human)

- Attempt a cross-origin form POST to a protected endpoint and confirm it receives 403.
