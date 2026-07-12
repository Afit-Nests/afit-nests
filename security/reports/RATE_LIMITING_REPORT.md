# RATE_LIMITING Security Report

## Status: PASS

## Findings

Rate limiting lives in:

```text
server/src/middleware.js
server/src/routes/auth.js
```

Login, registration, forgot password, and reset password routes now use `loginLimiter`. All `/api` routes use `apiLimiter`.

Fix implemented during this audit:

```js
router.post('/register/student', loginLimiter, validate(registerStudentSchema), ...)
router.post('/register/landlord', loginLimiter, validate(registerLandlordSchema), ...)
router.post('/password/reset', loginLimiter, validate(resetPasswordSchema), ...)
```

## What's at risk

Without rate limits, attackers could brute-force credentials, spam registrations, or brute-force reset tokens.

## What's already secure

- Auth-sensitive routes are rate limited.
- General API has a broader limiter.
- `trust proxy` is set for proxy-aware deployments.

## Recommendations

1. Confirm production proxy forwards a trustworthy client IP.
2. Consider separate stricter limits for failed login attempts by account identifier.
