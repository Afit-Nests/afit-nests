# FRONTEND_SECRETS Fix Plan

## Changes

- No code changes required after review.

## New files

- `security/reports/FRONTEND_SECRETS_REPORT.md`
- `security/plans/FRONTEND_SECRETS_PLAN.md`

## Verification goals

- [x] No secret keys in frontend files.
- [x] Sensitive API calls go through backend routes.
- [x] Only public keys are exposed to client code.
- [x] No public env variable holds a secret.

## Manual verification (for the human)

- In Netlify, ensure only `VITE_API_BASE_URL` and publishable public keys are configured.
