# ERROR_HANDLING Fix Plan

## Changes

- No code changes required after review.

## New files

- `security/reports/ERROR_HANDLING_REPORT.md`
- `security/plans/ERROR_HANDLING_PLAN.md`

## Verification goals

- [x] Global error handler catches unhandled route errors.
- [x] 500 responses contain generic messages.
- [x] Full error details are server-side only.
- [x] No stack traces are returned in API responses.

## Manual verification (for the human)

- In staging, trigger a database outage and confirm clients only see `Server error.`
