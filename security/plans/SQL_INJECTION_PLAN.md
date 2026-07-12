# SQL_INJECTION Fix Plan

## Changes

- No code changes required after review.

## New files

- `security/reports/SQL_INJECTION_REPORT.md`
- `security/plans/SQL_INJECTION_PLAN.md`

## Verification goals

- [x] Every database value uses parameterized placeholders.
- [x] Dynamic table/column names are allowlisted.
- [x] No SQL template literal interpolates raw user input as a value.

## Manual verification (for the human)

- Add SQL injection regression tests around `/api/data/:table` filters before expanding generic data access.
