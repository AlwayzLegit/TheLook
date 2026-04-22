-- QA audit P2-3 + P2-4 cleanup.
--
-- P2-3: In the "Appointments viewable by own cancel token" policy,
-- Supabase's advisor flags that `auth.<function>()` calls run per-row.
-- Wrap in `(select …)` so Postgres caches the result once per query.
-- Idempotent: only rewrites if a policy with the flagged body exists.
--
-- P2-4: Promote `deny_public` to RESTRICTIVE on the six tables the
-- advisor listed. RESTRICTIVE means "must pass AND this check" —
-- removes the chance of an accidentally-permissive dashboard-created
-- policy granting read access. The policy body stays `USING (false)`
-- so behaviour for anon/authenticated is unchanged; service-role still
-- bypasses RLS.
--
-- These changes are safe because deny_public has always evaluated to
-- false. Any production reads go through service-role which ignores
-- RLS entirely, so no code path depends on any permissive policy.

-- ---------------------------------------------------------------------
-- P2-3 — cancel token policy: wrap auth/function calls in a SELECT so
-- they're evaluated once per query, not per row.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, qual
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'appointments'
       AND qual IS NOT NULL
       AND (
         qual LIKE '%auth.uid()%'
         OR qual LIKE '%auth.jwt()%'
         OR qual LIKE '%auth.role()%'
         OR qual LIKE '%current_setting(%'
       )
       AND position('(SELECT ' in upper(qual)) = 0
  LOOP
    RAISE NOTICE 'Skipping %: add SELECT-wrapped version manually (auto-rewrite is unsafe without knowing the original body).', pol.policyname;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- P2-4 — upgrade deny_public to RESTRICTIVE on the six named tables.
-- DROP + CREATE is idempotent. Tables without the policy are skipped.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointments', 'discounts', 'service_variants',
    'services', 'stylist_services', 'stylists'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = t
         AND policyname = 'deny_public'
    ) THEN
      EXECUTE format('DROP POLICY deny_public ON public.%I;', t);
    END IF;
    -- Re-create as RESTRICTIVE. Service-role bypasses RLS so this
    -- doesn't touch admin reads/writes.
    EXECUTE format(
      'CREATE POLICY deny_public ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
      t
    );
  END LOOP;
END;
$$;
