-- ============================================================================
-- Card on file — Stripe customer + saved payment method + charges log
-- Run in Supabase SQL Editor. Idempotent. Safe to re-run.
-- ============================================================================

-- 1. Store the Stripe Customer id on the client so we can charge saved
--    cards off-session later.
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_client_profiles_stripe_customer
  ON public.client_profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2. Cache the Stripe customer on the appointment too — makes the admin
--    charge-fee button work even when the client has no client_profiles
--    row yet (the profile is only created the first time they book).
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(80);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(80);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS card_brand VARCHAR(40);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);

-- 3. Generalize the `deposits` record into `charges` — deposits,
--    cancellation fees, and any future manual charges all live here with a
--    `type` column so the ledger is unified.
CREATE TABLE IF NOT EXISTS public.charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_email VARCHAR(200),
  stripe_customer_id VARCHAR(80),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  type VARCHAR(32) NOT NULL,           -- 'deposit' | 'cancellation_fee' | 'manual'
  amount INTEGER NOT NULL,             -- cents
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL,         -- pending | succeeded | requires_action | failed | refunded
  card_brand VARCHAR(40),
  card_last4 VARCHAR(4),
  reason TEXT,                         -- why charged (e.g. "No-show 2026-05-04")
  failure_reason TEXT,                 -- when status=failed
  created_by VARCHAR(200),             -- admin email that triggered the charge
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charges_appointment ON public.charges(appointment_id);
CREATE INDEX IF NOT EXISTS idx_charges_email ON public.charges(client_email);
CREATE INDEX IF NOT EXISTS idx_charges_type_status ON public.charges(type, status);

-- RLS: mirror the `deposits` posture — only the service-role key (our
-- Next.js API routes) touches this table.
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

-- 4. Backfill: any existing `deposits` rows get mirrored into `charges` as
--    type='deposit' so the ledger is complete. Skipped cleanly when the
--    rows already exist (we de-dupe by stripe_payment_intent_id).
INSERT INTO public.charges (
  appointment_id, client_email, stripe_payment_intent_id, type, amount,
  currency, status, reason, created_at, updated_at
)
SELECT
  d.appointment_id,
  a.client_email,
  d.stripe_payment_intent_id,
  'deposit',
  d.amount,
  COALESCE(d.currency, 'USD'),
  d.status,
  'Booking deposit',
  d.created_at,
  d.updated_at
FROM public.deposits d
LEFT JOIN public.appointments a ON a.id = d.appointment_id
WHERE d.stripe_payment_intent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.charges c
     WHERE c.stripe_payment_intent_id = d.stripe_payment_intent_id
  );

-- 5. Small denormalized helper: appointments.cancellation_fee_charged flag
--    so the admin UI can tell at a glance whether the fee was already
--    collected (avoids charging twice).
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_fee_charged_cents INTEGER DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Sanity check — uncomment to inspect.
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'appointments' AND column_name LIKE 'stripe_%';
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'client_profiles' AND column_name = 'stripe_customer_id';
-- SELECT COUNT(*) FROM public.charges;
