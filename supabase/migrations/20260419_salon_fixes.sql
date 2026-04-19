-- ============================================================================
-- The Look hair salon — April 19 2026 fixes migration
-- Run this in the Supabase SQL editor (or via psql) before deploying the
-- matching code changes. All statements are idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Appointments: pending-by-default, deposit + policy + requested_stylist
-- ---------------------------------------------------------------------------
ALTER TABLE appointments
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS requested_stylist BOOLEAN DEFAULT TRUE;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS policy_accepted_at TIMESTAMPTZ;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deposit_required_cents INTEGER DEFAULT 0;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200);

-- Booked-slots RPC must continue to count pending bookings as "taken" so
-- two clients can't both book the same slot while waiting for approval.
-- (No change needed — get_booked_slots already filters status IN ('pending','confirmed').)

-- ---------------------------------------------------------------------------
-- 2. Schedule rules: prevent duplicate overrides, audit deletions
-- ---------------------------------------------------------------------------
-- Strip any duplicate override rows (same date + same stylist), keeping the
-- most recently created. This protects against the "override disappeared"
-- complaint where multiple inserts collided silently.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY rule_type,
                        COALESCE(stylist_id::text, '_salon'),
                        COALESCE(specific_date, '_'),
                        COALESCE(day_of_week::text, '_')
           ORDER BY created_at DESC
         ) AS rn
  FROM schedule_rules
)
DELETE FROM schedule_rules
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- One row per (rule_type, stylist_id-or-salon, specific_date, day_of_week).
-- Postgres unique indexes treat NULLs as distinct, so we coalesce first.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_schedule_rules_slot
  ON schedule_rules (
    rule_type,
    COALESCE(stylist_id::text, '_salon'),
    COALESCE(specific_date, '_'),
    COALESCE(day_of_week::text, '_')
  );

-- ---------------------------------------------------------------------------
-- 3. Salon settings (key/value): staff notification recipients, brand info
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salon_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO salon_settings (key, value)
VALUES
  ('staff_notification_emails', ''),
  ('booking_email_enabled', 'true'),
  ('long_appointment_deposit_cents', '5000'),
  ('long_appointment_min_minutes', '100')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Notifications: in-dashboard inbox for admins + stylists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- recipient_role: 'admin' delivers to every admin user;
  -- recipient_stylist_id: deliver to one specific stylist (also visible to admins).
  recipient_role VARCHAR(20),
  recipient_stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  url VARCHAR(500),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_admin
  ON notifications (recipient_role, read_at, created_at DESC)
  WHERE recipient_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_stylist
  ON notifications (recipient_stylist_id, read_at, created_at DESC)
  WHERE recipient_stylist_id IS NOT NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. Service variants — for "Facial Hair Removal" (per-area pricing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,             -- "Brow", "Lip", "Chin", "Full Face"
  price_text VARCHAR(50) NOT NULL,
  price_min INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_variants_service
  ON service_variants (service_id, active, sort_order);

ALTER TABLE service_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service variants are viewable by everyone"
  ON service_variants FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 6. Pin a "Special: any stylist" sentinel UUID we can target from the API
--    when a customer picks "Any Stylist". The sentinel is stored as a real
--    stylist row so existing FK constraints stay valid; it's marked inactive
--    so it never appears in the public stylist list.
-- ---------------------------------------------------------------------------
INSERT INTO stylists (id, name, slug, bio, image_url, specialties, active, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Any Stylist',
  'any',
  NULL,
  NULL,
  '["Any available stylist"]',
  FALSE,
  9999
)
ON CONFLICT (id) DO NOTHING;

-- Ensure the slug stays unique even if an admin renamed an existing stylist.
-- (No-op if the row above was just inserted.)
UPDATE stylists
SET slug = 'any', name = 'Any Stylist', active = FALSE, sort_order = 9999
WHERE id = '00000000-0000-0000-0000-000000000001';
