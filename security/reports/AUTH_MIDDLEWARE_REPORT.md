# AUTH_MIDDLEWARE Security Report

## Status: PASS

## Findings

Authentication is implemented in:

```text
server/src/auth.js
```

Protected route coverage:

```text
POST /api/auth/logout - requireAuth
GET /api/auth/me - requireAuth
POST /api/listings - requireAuth + landlord/admin role
PATCH /api/listings/:id - requireAuth + landlord/admin role
POST /api/payments/* - requireAuth + student/admin role as appropriate
GET /api/payments/pending-allocations - requireAuth + admin role
/api/admin/* - requireAuth + admin role
PUT /api/uploads/:bucket/:key - requireAuth
POST /api/data/:table write operations - require signed-in user
```

Public routes are limited to health, auth register/login/reset initiation, public listing reads, and static uploaded media.

## What's at risk

Any missing `requireAuth` on user-data routes could expose private profile, payment, message, or listing management data.

## What's already secure

- Auth middleware validates signed JWT session cookies.
- Admin routes require admin role.
- Landlord/student operations check role before mutation.
- Generic data route requires signed-in users for non-public collections.

## Recommendations

1. Keep route-level auth before handlers.
2. Add integration tests for 401 and 403 behavior.
3. Avoid adding new generic data tables without explicit authorization rules.
