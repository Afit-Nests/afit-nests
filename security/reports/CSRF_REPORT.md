# CSRF Security Report

## Status: PASS

## Findings

CSRF protection is implemented globally in:

```text
server/src/middleware.js
server/src/index.js
src/lib/apiClient.js
src/lib/personalBackendClient.js
```

Unsafe methods require an `x-csrf-token` header matching the `afit_nests_csrf` cookie. Session cookies are `httpOnly` and `sameSite: 'lax'`.

## What's at risk

Without CSRF checks, another site could attempt authenticated state-changing requests using the user's cookies.

## What's already secure

- All `/api` unsafe methods pass through `csrfProtection`.
- Frontend clients read the CSRF cookie and send the required header.
- Session cookies use SameSite=Lax.

## Recommendations

1. Keep all state-changing routes under `/api`.
2. Do not exempt new mutation routes from CSRF without a separate signature/auth design.
