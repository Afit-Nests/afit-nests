# ACCESS_CONTROL Security Report

## Status: PASS

## Findings

Resource ownership is checked in:

```text
server/src/routes/data.js
server/src/routes/listings.js
server/src/routes/payments.js
server/src/routes/admin.js
```

Fixes implemented during this audit:

```js
if (row.status !== 'paid_pending_confirmation' || !row.paystack_verified) {
  const error = new Error('Only verified pending payments can be confirmed.')
}
```

Public listing-by-id reads were tightened to return only available listings unless the caller is an admin or owning landlord.

## What's at risk

Without ownership checks, one signed-in user could read or mutate another user's chats, listings, viewings, payments, or profile.

## What's already secure

- Landlords can update only their listings.
- Students can create chats/viewings only for themselves.
- Messages require the user to be a chat participant.
- Admin-only payment and CMS actions require admin role.

## Recommendations

1. Add automated authorization tests per role.
2. Keep admin bypasses explicit and narrow.
3. Avoid accepting owner IDs from non-admin clients.
