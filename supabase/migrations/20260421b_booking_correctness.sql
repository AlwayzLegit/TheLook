-- B-06 + B-24 + B-23 — single source of truth for "busy", final FK index,
-- and RLS perf micro-opt.
--
-- 1. get_booked_slots now filters out is_test and archived_at rows so test
--    appointments never block real bookings and archived rows (cancelled /
--    no-show / completed) stop consuming slots. It also drops the legacy
--    search_path so a future schema-redirect can't shadow pg_catalog.
-- 2. Partial index matches the busy predicate so the RPC is index-only.
-- 3. B-24 remainder: backing index for appointments.service_id.
-- 4. B-23: if the legacy cancel_by_token RLS policy still exists in the
--    live DB, wrap its current_setting() call in a SELECT for better
--    plan caching (Supabase advisor flags the inline form as a perf hit).

-- ----------------------------------------------------------------------------
-- 1 + 2: canonical busy predicate + backing index.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_stylist_id uuid, p_date text)
RETURNS TABLE(start_time varchar, end_time varchar)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT a.start_time, a.end_time
    FROM public.appointments a
   WHERE a.stylist_id = p_stylist_id
     AND a.date = p_date
     AND a.status IN ('pending', 'confirmed')
     AND COALESCE(a.is_test, false) = false
     AND a.archived_at IS NULL;
$$;

-- Partial index matching the RPC's predicate. Massive win once we have
-- any real volume — the scan is bounded to the narrow set of blocking
-- rows for a given stylist+day.
CREATE INDEX IF NOT EXISTS idx_appointments_busy
  ON public.appointments(stylist_id, date)
  WHERE status IN ('pending', 'confirmed')
    AND COALESCE(is_test, false) = false
    AND archived_at IS NULL;

-- ----------------------------------------------------------------------------
-- 3. B-24 remainder: FK index on appointments.service_id (legacy single-
--    service column). Speeds up "delete service" cascades + admin service
--    detail lookups.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_service
  ON public.appointments(service_id);

-- ----------------------------------------------------------------------------
-- 4. B-23: wrap current_setting() in a SELECT if the legacy cancel_by_token
--    policy still exists in the live DB. Idempotent — no-op if the policy
--    was already dropped by the lockdown migration.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'appointments'
       AND policyname = 'cancel_by_token'
  ) THEN
    EXECUTE 'DROP POLICY cancel_by_token ON public.appointments';
    EXECUTE $p$
      CREATE POLICY cancel_by_token
        ON public.appointments
        FOR SELECT
        TO anon, authenticated
        USING (cancel_token = (SELECT current_setting('request.jwt.claim.cancel_token', true)))
    $p$;
  END IF;
END;
$$;
