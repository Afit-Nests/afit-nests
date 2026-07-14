-- Per-account login throttling.
-- The per-IP rate limiter does not stop a distributed brute force against a known
-- account (e.g. the admin, whose email is a well-known default). These columns let
-- login enforce a per-account lock with exponential backoff after repeated failures.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until timestamptz;
