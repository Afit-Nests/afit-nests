# PAYMENT_WEBHOOKS Fix Plan

## Changes

- `server/src/routes/payments.js` - require verified pending payment before admin confirmation.

## New files

- `security/reports/PAYMENT_WEBHOOKS_REPORT.md`
- `security/plans/PAYMENT_WEBHOOKS_PLAN.md`

## Verification goals

- [x] Payment success is verified with Paystack server-side.
- [x] Payment amount, reference, currency, and success status are checked.
- [x] Admin confirmation cannot confirm unverified payments.

## Manual verification (for the human)

- In staging, attempt to confirm an initialized unpaid payment from the admin UI/API and confirm it fails.
