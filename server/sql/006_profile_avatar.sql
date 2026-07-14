-- Profile avatar image URL.
-- The landlord profile page uploads an avatar and stores its public URL here.
-- Nullable and idempotent so re-running is safe on an existing database.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
