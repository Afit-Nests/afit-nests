# CORS Fix Plan

## Changes

- `server/src/index.js` - convert single CORS origin string into explicit allowlist.

## New files

- `security/reports/CORS_REPORT.md`
- `security/plans/CORS_PLAN.md`

## Verification goals

- [x] CORS origin is not `*`.
- [x] Credentials are allowed only for listed origins.
- [x] Unknown origins are rejected.

## Manual verification (for the human)

- In production, set `CLIENT_ORIGIN=https://your-frontend-domain`.
- Test from an unlisted origin and confirm browser blocks credentialed requests.
