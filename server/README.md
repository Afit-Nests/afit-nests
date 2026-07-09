# AFIT Nests PostgreSQL Backend

PostgreSQL is the production database for this project. Keep it private: the React app must never connect directly to the database.

## Setup

1. Create a PostgreSQL database and app user.
2. Copy `server/.env.example` to `server/.env`.
3. Fill in:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `COOKIE_SECRET`
   - `CLIENT_ORIGIN`
4. Run the schema:

```powershell
psql "$env:DATABASE_URL" -f server/sql/001_schema.sql
```

5. Start the backend:

```powershell
npm run backend
```

## Security Defaults

- Passwords are hashed with bcrypt cost 12.
- Login has rate limiting.
- Sessions are httpOnly cookies with 24 hour JWT expiry.
- Admin routes require admin role.
- Landlord listing updates require owner/admin authorization.
- SQL uses parameterized queries.
- Payment reservation uses database transactions and row locks.
- Database credentials stay server-side only.

## Production Notes

- Use a managed PostgreSQL provider with automated backups, encryption at rest, and private networking.
- Use a restricted database user for the app.
- Store secrets in your host environment, not `.env` committed to Git.
- Paystack final verification should be done server-side with the Paystack secret key before marking payments verified.
