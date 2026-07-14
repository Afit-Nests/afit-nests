-- TOTP-based multi-factor authentication.
-- totp_secret holds the base32 shared secret (present once enrollment starts);
-- totp_enabled flips true only after the user confirms a valid code, and login
-- then requires a code for that account. Clearing both disables MFA.
--
-- NOTE: totp_secret is stored in plaintext. The database is the trust boundary here;
-- if you want defence-in-depth, encrypt it at rest with a KMS/app key. Recovery if a
-- user loses their authenticator: re-run create-admin.js (it clears MFA on conflict)
-- or have another admin disable it.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
