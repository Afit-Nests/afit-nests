-- Enforce landlord phone uniqueness.
-- Landlord login authenticates by phone (routes/auth.js), so two landlords sharing
-- a phone makes login non-deterministic. Registration only prevented this indirectly
-- via the synthetic unique email; the profile-update path could still collide phones.
-- A partial unique index closes that gap without constraining student/admin phones.

-- Surface any pre-existing duplicates before the index build fails, so they can be
-- reconciled manually. Run this SELECT first if the CREATE INDEX below errors:
--   SELECT phone, count(*) FROM profiles
--   WHERE role = 'landlord' AND phone IS NOT NULL
--   GROUP BY phone HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_landlord_phone
  ON profiles (phone)
  WHERE role = 'landlord' AND phone IS NOT NULL;
