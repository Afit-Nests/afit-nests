# ACCESS_CONTROL Fix Plan

## Changes

- `server/src/routes/payments.js` - require pending paid and Paystack-verified status before admin confirmation.
- `server/src/routes/payments.js` - require pending paid status before rejection.
- `server/src/routes/data.js` - hide unavailable listing reads from non-admin/non-owner users.
- `server/src/routes/listings.js` - public listing-by-id only returns available listings.

## New files

- `security/reports/ACCESS_CONTROL_REPORT.md`
- `security/plans/ACCESS_CONTROL_PLAN.md`

## Verification goals

- [x] Resource routes check role and/or owner.
- [x] Failed ownership checks return 403 or 404 as appropriate.
- [x] Admin payment confirmation cannot confirm unverified payments.
- [x] Public listing reads do not expose unavailable listings.

## Manual verification (for the human)

- Log in as a landlord and try to edit another landlord's listing; confirm it fails.
- Try to open an occupied listing URL while logged out; confirm it returns not found.
