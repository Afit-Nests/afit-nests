# AUTH_MIDDLEWARE Fix Plan

## Changes

- No new auth middleware changes required in this pass.

## New files

- `security/reports/AUTH_MIDDLEWARE_REPORT.md`
- `security/plans/AUTH_MIDDLEWARE_PLAN.md`

## Verification goals

- [x] Every route returning or modifying user data has auth middleware or per-table auth.
- [x] Auth middleware runs before protected handlers.
- [x] Admin routes require admin role.
- [x] Public routes do not return private user data.

## Manual verification (for the human)

- From an incognito browser, verify `/admin/*`, `/student/*`, and `/landlord/*` protected API calls fail until logged in.
