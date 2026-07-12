# SECRETS_EXPOSURE Fix Plan

## Changes

- No source changes required after review.
- `.gitignore` already blocks real env files.

## New files

- `security/reports/SECRETS_EXPOSURE_REPORT.md`
- `security/plans/SECRETS_EXPOSURE_PLAN.md`

## Verification goals

- [x] `git ls-files .env` returns nothing.
- [x] Secret-pattern scans across tracked source return no real secrets.
- [x] No public frontend env var contains a secret key.
- [x] `.env.example` files contain placeholder values only.

## Manual verification (for the human)

- Confirm production host variables are set outside GitHub.
- Rotate any secret that was ever pasted into a ticket, screenshot, chat, or public page.
