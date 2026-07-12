# AFIT Nests Backend

The backend is an Express API backed by PostgreSQL. It owns authentication, authorization, database access, payment verification, uploads, notifications, audit logs, and admin operations. The React frontend must call this API; it must never connect directly to PostgreSQL.

## Environment Variables

Copy `server/.env.example` to `server/.env` for local development.

Required:

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: at least 32 random characters.
- `COOKIE_SECRET`: at least 32 random characters.
- `CLIENT_ORIGIN`: frontend origin, for example `http://localhost:5173`.
- `PAYSTACK_PUBLIC_KEY`: Paystack public key sent to the browser through the backend payment response.
- `PAYSTACK_SECRET_KEY`: Paystack secret key. Server-side only.

Optional:

- `PORT`: backend port, default `4000`.
- `ALLOW_DEV_RESET_URL`: set `true` only in local development if you need reset URLs returned in API responses.
- `ALLOW_LOCAL_UPLOADS`: set `true` only for local or controlled temporary deployments. Production should use external object storage.

## Setup

Create the database and app user, then run:

```powershell
psql "$env:DATABASE_URL" -f server/sql/001_schema.sql
```

If the database already exists from an older version, also run:

```powershell
psql "$env:DATABASE_URL" -f server/sql/002_product_features.sql
```

Start the API:

```powershell
npm run backend
```

Health check:

```text
GET /api/health
```

## Database Tables

Core tables:

- `profiles`: students, landlords, admins, hashed passwords, role data, session version.
- `listings`: accommodation listings, prices, status, reservation state.
- `viewings`: student viewing requests.
- `chats` and `messages`: in-app communication.
- `payments`: Paystack-backed payment records.
- `password_reset_tokens`: hashed password reset tokens.
- `cms_pages` and `platform_settings`: admin-managed content/settings.

Reliability and safety tables:

- `notifications`: in-app notification records.
- `saved_listings`: student saved listings.
- `listing_availability`: landlord/admin viewing availability.
- `reviews`: student reviews after confirmed/completed viewings.
- `audit_logs`: admin/payment/listing security trail.
- `refunds`: refund follow-up records for rejected paid allocations.

## Listing Status Flow

Listings use these statuses:

- `pending_review`: landlord submitted, waiting for admin.
- `rejected`: admin rejected listing.
- `available`: public and payable.
- `pending_confirmation`: paid, awaiting admin allocation confirmation.
- `occupied`: allocation confirmed or landlord marked occupied.

Landlord-created listings start as `pending_review`. Admin-created listings can be saved as `available`.

## Security Defaults

- Passwords are hashed with bcrypt cost 12.
- Password policy is 8-128 chars with uppercase, lowercase, number, symbol, and no spaces.
- Sessions are HttpOnly cookies with 24 hour JWT expiry.
- JWTs include `session_version`; logout and password reset invalidate old copied tokens.
- Auth endpoints are rate-limited.
- Every admin route requires the `admin` role server-side.
- Landlord listing updates require owner/admin authorization.
- Student-only actions are enforced server-side.
- SQL uses parameterized queries.
- Zod validates request payloads on API routes.
- CORS uses explicit `CLIENT_ORIGIN` allowlist.
- CSRF protection is enabled for unsafe methods.
- Paystack webhook is the only CSRF bypass and must have a valid `x-paystack-signature`.
- Helmet security headers are enabled.
- Production validation errors avoid detailed internals.
- Database credentials stay server-side only.

## Payments

Payment initialization:

```text
POST /api/payments/initialize
```

The request only sends `listingId`. The backend reads the listing price from PostgreSQL and creates the payment reference. The browser never gets to choose the payable amount.

Paystack callback:

```text
POST /api/payments/paystack/callback
```

Paystack webhook:

```text
POST /api/payments/paystack/webhook
```

Webhook verification:

- Uses `x-paystack-signature`.
- HMAC SHA-512 uses `PAYSTACK_SECRET_KEY`.
- The payment is still verified server-side with Paystack before marking it paid.

Admin confirmation:

```text
POST /api/payments/:id/confirm
POST /api/payments/:id/reject
```

Rejecting a paid allocation reopens the listing and creates a `refunds` record for follow-up.

## Uploads

Upload endpoint:

```text
PUT /api/uploads/:bucket/:key
```

Rules:

- Auth required.
- Listing uploads require landlord/admin.
- Allowed buckets: `listings`, `avatars`.
- Allowed types: JPG, PNG, WEBP.
- Server checks MIME type and image magic bytes.
- Max upload size is 5 MB.
- Production local uploads are disabled unless `ALLOW_LOCAL_UPLOADS=true`.

For real production, use external object storage such as Cloudinary, Cloudflare R2, S3, or Supabase Storage. Keep uploads on a separate media domain where possible.

## User Deletion

Self deletion:

```text
DELETE /api/auth/me
```

Admin deletion/anonymization:

```text
DELETE /api/admin/users/:id
```

If financial records exist, the account is anonymized instead of hard-deleted so payment/audit records remain consistent.

## Access User Scripts

Create admin:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="Use-A-Complex-Password1!"
$env:ADMIN_FULL_NAME="AFIT Nests Admin"
npm run create-admin
```

Create standard access users:

```powershell
$env:ACCESS_ADMIN_PASSWORD="Use-A-Complex-Password1!"
$env:ACCESS_LANDLORD_PASSWORD="Use-A-Complex-Password2!"
$env:ACCESS_STUDENT_PASSWORD="Use-A-Complex-Password3!"
npm run create-access-users
```

## Production Checklist

- Set `NODE_ENV=production`.
- Use HTTPS for frontend and backend.
- Set `CLIENT_ORIGIN` to the exact frontend origin.
- Use a managed PostgreSQL provider with backups, encryption at rest, and private networking.
- Use a restricted app database user.
- Store secrets only in backend host environment variables.
- Keep `.env` files out of Git.
- Rotate any secret that ever appeared in old Git history.
- Configure Paystack webhook URL and verify it returns 200 only for signed requests.
- Use object storage for uploads before real users rely on listing photos.
- Confirm `npm audit --omit=dev` returns 0 critical/high vulnerabilities.
