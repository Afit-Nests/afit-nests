# DATABASE_ACCESS Fix Plan

## Changes

- No RLS changes apply because this is not a direct Supabase/Firebase client architecture.
- Continue using backend-mediated PostgreSQL access.

## New files

- `security/reports/DATABASE_ACCESS_REPORT.md`
- `security/plans/DATABASE_ACCESS_PLAN.md`

## Verification goals

- [x] Frontend does not contain `DATABASE_URL`.
- [x] Backend loads `DATABASE_URL` only server-side.
- [x] Database queries are behind API routes with role or ownership checks.
- [x] No anon database key exists for browser table access.

## Manual verification (for the human)

- Confirm production PostgreSQL firewall/network rules allow only the backend host.
- Confirm production database user is not a superuser.
