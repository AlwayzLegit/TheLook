-- Deposit rules engine: replaces the hard-coded price threshold + the
-- accidentally-minutes-based admin setting with a first-class table that
-- the owner can CRUD from /admin/settings → Booking.
--
-- A booking triggers a deposit when ANY active rule matches. When more
-- than one rule matches, the HIGHEST deposit_cents among them wins
-- (conservative default — never charge less than the strictest rule).
--
-- Supported trigger types:
--   min_price_cents       — matches when total price (cents) >= value
--   min_duration_minutes  — matches when total duration (minutes) >= value
--
-- Deleting all rules = no deposit ever required. The DB is the only
-- source of truth; the old constants / salon_settings rows are ignored.

CREATE TABLE IF NOT EXISTS deposit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('min_price_cents','min_duration_minutes')),
  trigger_value integer NOT NULL CHECK (trigger_value >= 0),
  deposit_cents integer NOT NULL CHECK (deposit_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposit_rules_active
  ON deposit_rules (active) WHERE active = true;

-- Seed: preserve the existing price-based rule so behaviour matches
-- what the code enforced before. Only seeds on an empty table so
-- re-running the migration after the owner has added rules is a no-op.
INSERT INTO deposit_rules (name, trigger_type, trigger_value, deposit_cents, active, sort_order)
SELECT 'Bookings priced over $100', 'min_price_cents', 10000, 5000, true, 0
WHERE NOT EXISTS (SELECT 1 FROM deposit_rules);

-- Drop the two legacy salon_settings rows that powered the old UI.
-- Harmless if they were never inserted.
DELETE FROM salon_settings WHERE key IN ('long_appointment_deposit_cents','long_appointment_min_minutes');
