# AFIT Nests

**Find verified student accommodation near AFIT — book it, pay for it, and settle in, all in one place.**

AFIT Nests connects students with trusted landlords for off-campus housing around the Air Force
Institute of Technology, Barkallahu.

## For students
- Browse nearby listings with photos, prices, amenities, and distance from campus.
- Save the places you like and compare them.
- Chat directly with landlords and book a viewing at a time that suits you.
- Pay securely online and track your accommodation status from request to confirmation.
- Leave a review after a confirmed viewing to help other students choose well.

## For landlords
- List your properties with photos, pricing, and amenities.
- Receive and manage viewing requests and messages from interested students.
- Track paid allocations and keep your listings up to date.

## For administrators
- Review and verify landlords and listings.
- Confirm paid allocations and handle disputes.
- Keep platform content and settings current.

---

AFIT Nests — safe, simple student housing.

---

## Google sign-in (production-hardened PKCE flow)

Students can sign in with Google on the student login page. The flow is a
server-side OAuth 2.0 **authorization code flow with PKCE** (RFC 7636). There
is no client-side Google SDK and no id_token in the browser; the browser is
redirected to Google with a one-time `code_challenge` and `state`, and the
backend exchanges the returned `code` for tokens over a private channel.

### Setup

1. In Google Cloud Console → APIs & Services → Credentials, create an **OAuth
   2.0 Client ID** of type **Web application**.
2. Add these **Authorized redirect URIs** (must match exactly — Google
   rejects mismatches, including trailing slashes and HTTP/HTTPS variants):

   ```
   http://localhost:4000/api/auth/google/callback                       (local dev)
   https://api.your-domain.example/api/auth/google/callback             (prod)
   ```

3. Add these **Authorized JavaScript origins** (the SPA origin — for
   completeness; we use the redirect flow so this isn't strictly required
   for our endpoints, but Google still asks for it):

   ```
   http://localhost:5173
   https://your-domain.example
   ```

4. Copy both the **client id** and the **client secret** into your env:

   ```bash
   # server/.env
   GOOGLE_CLIENT_ID=1234567890-…apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-…
   ALLOW_GOOGLE_SIGNUP=true   # set false to disable new-account signup
   ```

5. Restart the backend. The "Continue with Google" button on
   `/student/login` starts the redirect to Google automatically; no SPA
   rebuild is required because the SPA never embeds the client secret.

### How accounts are linked

- **Returning Google user** (we already have a `google_sub` for them) → signed
  in immediately. No password required.
- **Existing email/password user** whose verified Google email matches →
  Google's `sub` is attached to their existing account on the fly. They can
  then sign in with either method.
- **New user** → a student account is created, but only when
  `ALLOW_GOOGLE_SIGNUP=true`. With signup off, the user gets a clear
  "sign up with email first" message so existing email accounts can't be
  silently created from arbitrary Google identities.

### Security model

This flow was hardened against the standard OAuth attack catalogue:

- **PKCE S256 only** — the `code_verifier` is 64 random bytes (base64url,
  86 chars) generated via Node's `crypto.randomBytes`. The `code_challenge`
  is `base64url(sha256(verifier))`. The `plain` method is not used.
- **High-entropy `state`** — 32 random bytes (base64url). Mismatched,
  missing, or expired state rejects the callback with `state_mismatch` /
  `invalid_or_expired_state`.
- **Ephemeral backend storage of verifier + state** — a single short-lived
  HMAC-signed cookie (`afit_nests_oauth_state`, `Max-Age=10m`, `HttpOnly`,
  `SameSite=Lax`, `Secure` in production). The cookie is purged on every
  callback outcome — success, failure, or exception — so a stale verifier
  cannot be replayed.
- **Server-to-server token exchange** — `POST
  https://oauth2.googleapis.com/token` runs entirely in the backend. The
  `client_secret` is only ever read from `process.env.GOOGLE_CLIENT_SECRET`
  on the server.
- **Asymmetric id_token validation via JWKS** — Google's published JWK set
  is fetched from `https://www.googleapis.com/oauth2/v3/certs`. We use
  `jose.jwtVerify` to check the RS256 signature, the `iss` is in
  `{accounts.google.com, https://accounts.google.com}`, the `aud` equals
  our configured client id, and `email_verified` is `true`. The token's
  built-in `exp` claim is also enforced.
- **HttpOnly + Secure + SameSite=Lax session cookie** — same cookie the
  password login flow issues. JavaScript on the page cannot read it
  (HttpOnly). The cookie is `Secure` in production so it is only sent over
  HTTPS. `SameSite=Lax` allows it to come back on the cross-origin
  callback GET without enabling broader cross-site cookie attachment.
- **HSTS in production** — `Strict-Transport-Security: max-age=31536000;
  includeSubDomains` is sent by helmet when `NODE_ENV=production`. This
  forces browsers to use HTTPS for every subsequent visit.
- **Exact redirect URI matching** — the backend builds `redirect_uri` from
  the request's `Host` and `X-Forwarded-Proto` headers (with `trust proxy`
  set), and the same string is sent to Google. No wildcards; no HTTP
  variants in production.
- **Helmet CSP** allows `https://accounts.google.com` (GIS scripts in case
  we ever add them), `https://oauth2.googleapis.com` and
  `https://www.googleapis.com` (token exchange + JWKS). No inline scripts
  are added.
- **Rate limit** — `/auth/google/start` and `/auth/google/callback` are
  each limited to 30 requests per 15 minutes per IP.
- **Admin accounts cannot be linked or signed in via Google.** The
  email-match branch rejects any non-student/non-landlord role, so a
  compromised email-owner cannot graft OAuth onto an admin account.
- **Unlinking requires the current password** so a hijacked session can't
  quietly strip a passwordless Google-only account and strand the user.

### Unlinking

Students can link and unlink Google from `/student/profile` → Connected
Accounts. Unlink asks for the account password to confirm. The SPA calls
`DELETE /api/auth/google` (CSRF-protected); the backend deletes
`google_sub` from the profile.

### Local development tip

Because the redirect_uri is built from the request host, you can run the
backend on `http://localhost:4000` and add that URL (with
`/api/auth/google/callback`) to the Authorized redirect URIs list. If you
run behind a reverse proxy, set `X-Forwarded-Proto`/`X-Forwarded-Host`
correctly so the production HTTPS scheme is what hits Google's allowlist.
