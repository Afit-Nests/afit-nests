# DATABASE_ACCESS Security Report

## Status: PASS

## Findings

This app uses a private Express/PostgreSQL backend, not direct browser-to-Supabase/Firebase table access. The React frontend sends API requests to the backend; the backend reads `DATABASE_URL` server-side in:

```text
server/src/db.js
```

The browser does not receive database credentials. Database access is mediated by route auth and ownership checks in:

```text
server/src/routes/data.js
server/src/routes/admin.js
server/src/routes/listings.js
server/src/routes/payments.js
```

## What's at risk

If the backend host exposes `DATABASE_URL`, or if an API route omits authorization, attackers could access or modify database records.

## What's already secure

- Database credentials remain server-side.
- SQL queries use parameterized placeholders.
- Admin collections are behind `requireAuth` and `requireRole('admin')`.
- Generic data route uses table allowlists and per-table authorization.

## Recommendations

1. Use a restricted production database user.
2. Keep PostgreSQL unavailable from the public internet where possible.
3. Run schema migrations only from trusted deployment/admin environments.
