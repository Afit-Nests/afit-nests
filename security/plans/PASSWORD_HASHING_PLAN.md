# PASSWORD_HASHING Fix Plan

## Changes

- No code changes required after review.

## New files

- `security/reports/PASSWORD_HASHING_REPORT.md`
- `security/plans/PASSWORD_HASHING_PLAN.md`

## Verification goals

- [x] Passwords are hashed with bcrypt.
- [x] No weak password hashing algorithm is used.
- [x] Login verifies with `bcrypt.compare`.
- [x] Password hashes are not sent to clients.

## Manual verification (for the human)

- Inspect production `profiles.password_hash` values and confirm they begin with bcrypt prefixes such as `$2a$`, `$2b$`, or `$2y$`.
