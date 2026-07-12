# SSRF Security Report

## Status: PASS

## Findings

Searched for server-side `fetch` and user-supplied URL fetching. The only backend server-side external request is:

```text
server/src/routes/payments.js
```

It calls Paystack's fixed verification endpoint:

```js
const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/'
```

User input is only appended as an encoded payment reference, not used as a hostname.

## What's at risk

If future features fetch arbitrary user-provided URLs, attackers could target internal metadata services or private network resources.

## What's already secure

- No current server-side user-supplied URL fetching exists.
- Paystack verification hostname is hardcoded.

## Recommendations

1. Keep all webhook/import/image-proxy URLs allowlisted.
2. If user URL fetching is added, block private IP ranges and non-http(s) schemes.
