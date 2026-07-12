# RATE_LIMITING Fix Plan

## Changes

- `server/src/routes/auth.js` - apply `loginLimiter` to registration and password reset.

## New files

- `security/reports/RATE_LIMITING_REPORT.md`
- `security/plans/RATE_LIMITING_PLAN.md`

## Verification goals

- [x] Login has rate limiting.
- [x] Registration has rate limiting.
- [x] Forgot/reset password endpoints have rate limiting.
- [x] Rate-limited requests return 429 through `express-rate-limit`.

## Manual verification (for the human)

- In staging, submit more than five login/reset attempts within 15 minutes and confirm 429 responses.
