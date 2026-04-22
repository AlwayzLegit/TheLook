-- A2P 10DLC compliance: persist SMS consent captured on the contact and
-- booking forms so we can prove each customer opted in.
--
-- One record per opt-in: the timestamp it was captured + what source
-- triggered it. Defaulting to FALSE is deliberate — existing rows pre-dating
-- the checkbox haven't opted in yet.

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

-- Fast lookup for marketing / outreach code that only targets opted-in
-- clients. No-op on small tables; keeps queries sharp as the list grows.
CREATE INDEX IF NOT EXISTS idx_client_profiles_sms_consent
  ON client_profiles (sms_consent) WHERE sms_consent = true;
