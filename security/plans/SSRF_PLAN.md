# SSRF Fix Plan

## Changes

- No code changes required.

## New files

- `security/reports/SSRF_REPORT.md`
- `security/plans/SSRF_PLAN.md`

## Verification goals

- [x] No user-supplied URL controls a server-side request host.
- [x] Paystack request host is fixed.
- [x] No private IP bypass surface exists today.

## Manual verification (for the human)

- Re-run this category if adding link previews, imports from URL, webhooks, or image proxying.
