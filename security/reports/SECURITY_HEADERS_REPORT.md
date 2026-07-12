# SECURITY_HEADERS Security Report

## Status: PASS

## Findings

Security headers are configured globally in:

```text
server/src/index.js
```

The app uses Helmet with a Content Security Policy. Helmet also sets common defaults such as HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.

## What's at risk

Missing security headers can increase XSS, clickjacking, MIME sniffing, and downgrade attack risk.

## What's already secure

- Helmet is global middleware before routes.
- CSP allows only app scripts plus Paystack checkout scripts/frames.
- `x-powered-by` is disabled.

## Recommendations

1. Verify headers on the deployed backend with browser devtools or curl.
2. Keep CSP narrow when adding third-party scripts.
