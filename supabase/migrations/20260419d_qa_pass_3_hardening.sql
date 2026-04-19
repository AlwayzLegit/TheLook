-- ============================================================================
-- QA pass 3 — Supabase hardening + data cleanup
-- Run in Supabase SQL Editor. Idempotent. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- DEF-001 / DEF-002 / DEF-003: Remove overly permissive RLS policies.
-- Every write path on these tables already flows through Next.js API routes
-- using the service-role key, so dropping these anon/auth policies has no
-- user-visible effect; it closes the latent breach path.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_public_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointment services insertable" ON public.appointment_services;
DROP POLICY IF EXISTS "Appointment services viewable" ON public.appointment_services;
DROP POLICY IF EXISTS "Contact messages can be created by anyone" ON public.contact_messages;
DROP POLICY IF EXISTS "Waitlist can be created by anyone" ON public.waitlist;
DROP POLICY IF EXISTS "Admin log can be inserted" ON public.admin_log;

-- ---------------------------------------------------------------------------
-- DEF-006: Pin search_path on the helper function so a future schema
-- redirect attack can't shadow pg_catalog.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn_signature text;
BEGIN
  SELECT format('%s.%s(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    INTO fn_signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_booked_slots'
   LIMIT 1;
  IF fn_signature IS NOT NULL THEN
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', fn_signature);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- DEF-010: Delete the active "Any Stylist" duplicate row. The booking flow
-- injects its own Any-Stylist tile client-side; the inactive sentinel row
-- remains as the canonical id. Keeping both confuses the public /stylists
-- page and the dashboard.
-- ---------------------------------------------------------------------------
-- First, reparent any appointments that were saved against the active
-- duplicate so we don't violate FK when deleting.
UPDATE public.appointments
   SET stylist_id = '00000000-0000-0000-0000-000000000001'
 WHERE stylist_id = '308ae92a-bdb4-4bb9-a539-c62747913bcc';

-- Same for stylist_services mappings / schedule rules / commissions.
DELETE FROM public.stylist_services WHERE stylist_id = '308ae92a-bdb4-4bb9-a539-c62747913bcc';
DELETE FROM public.schedule_rules WHERE stylist_id = '308ae92a-bdb4-4bb9-a539-c62747913bcc';
DELETE FROM public.stylist_commissions WHERE stylist_id = '308ae92a-bdb4-4bb9-a539-c62747913bcc';

DELETE FROM public.stylists
 WHERE id = '308ae92a-bdb4-4bb9-a539-c62747913bcc'
   AND name = 'Any Stylist';

-- ---------------------------------------------------------------------------
-- DEF-011: Normalize stylist.specialties to canonical JSON array shape.
-- The API-side normalizeSpecialties() will keep new writes clean; this
-- migration back-fills the existing bad rows.
-- ---------------------------------------------------------------------------

-- Alisa (Liz) — "30+ Years" is marketing, not a specialty.
UPDATE public.stylists
   SET specialties = '["Cutting","Coloring","Highlighting","Styling"]'
 WHERE slug = 'alisa-liz';

-- Kristina — "Men & Women" is an audience, not a skill.
UPDATE public.stylists
   SET specialties = '["Cutting","Coloring","Highlighting","Extensions","Styling"]'
 WHERE slug = 'kristina';

-- Jasmine — split the comma-joined string into proper array entries.
UPDATE public.stylists
   SET specialties = '["Men''s Cuts","Women''s Cuts","Color","Highlights","Styling"]'
 WHERE slug = 'jasmine';

-- Janet — same fix.
UPDATE public.stylists
   SET specialties = '["Men''s Cuts","Women''s Cuts","Coloring","Styling"]'
 WHERE slug = 'janet';

-- ---------------------------------------------------------------------------
-- OPTIONAL DATA CLEANUP (commented out — review first, uncomment to run)
-- ---------------------------------------------------------------------------
-- DELETE FROM public.appointments WHERE client_email IN (
--   'Testingg@hh.com',
--   'jns@mf.com',
--   'qa-audit-test@example.test'
-- );
--
-- Orphan tokens (DEF-005). Inspect before deleting:
-- SELECT email, expires_at, used_at, created_at
--   FROM public.client_access_tokens
--  ORDER BY created_at DESC;
-- DELETE FROM public.client_access_tokens
--  WHERE expires_at < now() AND used_at IS NULL;
