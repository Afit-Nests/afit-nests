# PAYMENT_WEBHOOKS Security Report

## Status: PASS

## Findings

The app uses Paystack, not Stripe. There is no unauthenticated payment webhook endpoint. Payment completion is handled through:

```text
server/src/routes/payments.js
```

The backend verifies each payment directly with Paystack using `PAYSTACK_SECRET_KEY` before marking payment as paid pending confirmation.

Fix implemented during this audit: admin confirmation now requires `paid_pending_confirmation` and `paystack_verified`.

## What's at risk

If payment status could be updated without Paystack verification, attackers could reserve or occupy properties without paying.

## What's already secure

- Browser never receives `PAYSTACK_SECRET_KEY`.
- Paystack transaction reference, amount, status, and currency are verified server-side.
- Admin confirmation cannot bypass Paystack verification after this audit.

## Recommendations

1. If Paystack webhooks are added later, verify Paystack signatures and store processed event IDs.
2. Keep all payment state transitions server-side.
