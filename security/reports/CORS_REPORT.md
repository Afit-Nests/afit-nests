# CORS Security Report

## Status: PASS

## Findings

CORS is configured in:

```text
server/src/index.js
```

Fix implemented during this audit: `CLIENT_ORIGIN` is parsed as an explicit comma-separated allowlist and requests from unlisted origins are rejected.

```js
if (!origin || clientOrigins.includes(origin)) return callback(null, true)
return callback(new Error('Origin is not allowed by CORS.'))
```

## What's at risk

Wildcard or reflected CORS with credentials could let attacker-controlled origins make authenticated browser requests.

## What's already secure

- No wildcard origin.
- Credentials are paired with an explicit allowlist.
- Same-origin/no-origin server requests still work.

## Recommendations

1. Set `CLIENT_ORIGIN` in production to the exact frontend URL.
2. Use comma-separated origins only for real deployed frontend domains.
