-- Google OAuth (sign-in with Google for students).
--
-- google_sub is the stable Google "sub" claim from the verified id_token. It is
-- what lets a returning user be matched back to their account without trusting
-- the (mutable) email. We treat it as the identity anchor for OAuth: link by sub,
-- not by email. A unique partial index on sub (where present) prevents two
-- accounts from ever claiming the same Google identity.
--
-- google_linked_at records when the link was established, mostly for audit and
-- for surfacing "Linked on …" in the UI.
--
-- Both columns are added with IF NOT EXISTS so re-running the migration is safe,
-- matching the pattern used by 003_…/005_…/006_….

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_sub text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_linked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_google_sub
  ON profiles (google_sub)
  WHERE google_sub IS NOT NULL;
