# AFIT Nests

AFIT Nests is a secure accommodation marketplace for AFIT students, landlords, and administrators. The app lets students browse nearby listings, chat with landlords, book viewings, save listings, pay through Paystack, and track accommodation status. Landlords can submit listings and manage requests. Admins review landlords, approve listings, confirm paid allocations, manage content, and audit platform activity.

## Current Architecture

- Frontend: React, Vite, React Router, Leaflet maps, PWA support.
- Backend: Express, PostgreSQL, Zod validation, cookie sessions, CSRF protection.
- Database: PostgreSQL only. The browser must never connect directly to the database.
- Payments: Paystack initialized and verified server-side.
- Uploads: Image uploads are validated server-side. Production local uploads are disabled by default.

## Main Features

- Student, landlord, and admin account flows.
- Complex password policy: 8-128 characters, uppercase, lowercase, number, symbol, no spaces.
- Passwords hashed with bcrypt cost 12.
- HttpOnly cookie sessions with 24 hour JWT expiry.
- Logout and password reset invalidate copied/old session tokens.
- Admin and role-protected API routes.
- Listing approval workflow: landlord submissions start as `pending_review`.
- Listing prices stored server-side and used for payment initialization.
- Student saved listings.
- Student reviews, restricted to students with confirmed/completed viewings.
- Viewing requests, chat records, notifications, audit logs, refund records.
- Paystack payment callback and signed webhook verification.
- CMS/admin area for users, listings, records, content, settings, refunds, reviews, and audit logs.

## Repository Layout

```text
src/                    React frontend
server/src/             Express backend
server/sql/             PostgreSQL schema and migrations
security/               Security audit reports and remediation plans
server/.env.example     Backend environment variable template
.env.example            Frontend environment variable template
```

## Local Setup

Install dependencies:

```powershell
npm install
```

Create frontend env:

```powershell
Copy-Item .env.example .env
```

Create backend env:

```powershell
Copy-Item server/.env.example server/.env
```

Fill `server/.env` with real backend-only secrets:

- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `CLIENT_ORIGIN`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`

Run the schema:

```powershell
psql "$env:DATABASE_URL" -f server/sql/001_schema.sql
```

For an existing database, also run:

```powershell
psql "$env:DATABASE_URL" -f server/sql/002_product_features.sql
```

Start the backend:

```powershell
npm run backend
```

Start the frontend in another terminal:

```powershell
npm run dev
```

## Admin and Access Users

Create the first admin account from environment variables:

```powershell
$env:ADMIN_EMAIL="<admin-email>"
$env:ADMIN_PASSWORD="<strong-private-password>"
$env:ADMIN_NAME="<admin-display-name>"
npm run create-admin
```

Create any required access users from environment variables:

```powershell
$env:ACCESS_ADMIN_PASSWORD="<strong-private-password>"
$env:ACCESS_LANDLORD_PASSWORD="<strong-private-password>"
$env:ACCESS_STUDENT_PASSWORD="<strong-private-password>"
npm run create-access-users
```

Never commit real passwords, generated hashes, tokens, database URLs, or any `.env` file.

## Deployment Notes

Frontend host:

- Set `VITE_API_BASE_URL` to the deployed backend API URL, for example `https://api.example.com/api`.
- Only public browser-safe values may use `VITE_` prefixes.
- Do not put database URLs, Paystack secret keys, JWT secrets, or cookie secrets in frontend env vars.

Backend host:

- Set `NODE_ENV=production`.
- Set `CLIENT_ORIGIN` to the deployed frontend origin. Multiple origins can be comma-separated.
- Keep `ALLOW_DEV_RESET_URL=false`.
- Keep `ALLOW_LOCAL_UPLOADS=false` unless this is a controlled temporary deployment.
- Use HTTPS for the backend and frontend.
- Put production uploads in external object storage such as Cloudinary, Cloudflare R2, S3, or Supabase Storage.
- Use a managed PostgreSQL provider with backups enabled and a restricted app database user.

Paystack:

- Payment amount is taken from the server-side listing price, not the browser.
- Configure Paystack webhook URL as:

```text
https://your-backend-domain/api/payments/paystack/webhook
```

- Webhooks must include the valid `x-paystack-signature`.

## Security Status

The app includes baseline production security controls:

- No committed current `.env` files.
- Browser code does not query PostgreSQL directly.
- API routes enforce auth and role checks server-side.
- SQL uses parameterized queries.
- Zod validates API input server-side.
- CORS is an explicit origin allowlist.
- CSRF protection is enabled for unsafe methods, except the signed Paystack webhook.
- Helmet security headers are configured.
- Auth endpoints are rate-limited.
- File uploads check content type and image magic bytes.
- Production local uploads fail closed unless explicitly enabled.
- Production validation errors avoid detailed internals.

Run verification:

```powershell
npm run build
npm audit --omit=dev
```

Known note: `npm run lint` may still report pre-existing style/config warnings unrelated to production build safety.

## Documentation

- Backend details: [server/README.md](server/README.md)
