# PASSWORD_HASHING Security Report

## Status: PASS

## Findings

Password hashing is implemented with bcrypt in:

```text
server/src/routes/auth.js
server/src/routes/admin.js
server/src/scripts/create-admin.js
server/src/scripts/create-access-users.js
```

Passwords are hashed with cost 12 before storage. Login uses `bcrypt.compare`.

## What's at risk

Weak hashing or plaintext storage would make database compromise much more damaging.

## What's already secure

- Uses bcrypt, not MD5/SHA-1/SHA-256 for passwords.
- Bcrypt cost is 12.
- `profiles.password_hash` is returned only internally for comparison, not to clients.
- Password policy requires 8-128 characters with uppercase, lowercase, number, symbol, and no spaces.

## Recommendations

1. Keep bcrypt cost 12 unless login latency becomes unacceptable.
2. Force reset for any users created before strong password policy if needed.
