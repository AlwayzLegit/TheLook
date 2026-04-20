-- ============================================================================
-- B-01 / B-02 — Lock down public schema grants + codify deny-by-default RLS.
--
-- Why: every read/write in this app already flows through Next.js API routes
-- using the service-role key (which bypasses RLS + grants). The browser never
-- talks to Supabase directly. So anon/authenticated need no privileges at all
-- on application tables. This migration makes that intent explicit so a
-- forgotten-policy-after-CREATE-TABLE can't silently expose a table.
--
-- Two belt-and-suspenders layers:
--   1. REVOKE ALL on every public table from anon/authenticated.
--   2. Enable RLS + a deny_public policy that blocks both roles unconditionally.
--
-- Server routes use service-role, which bypasses both. If a future table
-- needs anon read (e.g. another marketing-style page), explicitly add the
-- minimal GRANT + a permissive policy in a follow-up migration.
--
-- Idempotent + forward-only. Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Blanket REVOKE on every existing public table.
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- Future-proof: any new table created in `public` defaults to no anon/auth
-- privileges. Only roles invoked by server code (service_role) get access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS + add an explicit deny_public policy on every table.
--    Service-role bypasses RLS, so server routes are unaffected.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
      FROM pg_tables
     WHERE schemaname = 'public'
  LOOP
    -- Enable RLS (idempotent).
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', t.schemaname, t.tablename);

    -- Drop any prior copy of our deny policy so the WITH CHECK / USING
    -- clauses can be updated cleanly on re-runs.
    EXECUTE format('DROP POLICY IF EXISTS deny_public ON %I.%I;', t.schemaname, t.tablename);

    -- Hard deny for both anon and authenticated. Service-role still bypasses.
    EXECUTE format(
      'CREATE POLICY deny_public ON %I.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
      t.schemaname, t.tablename
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Sanity: server-side helper functions stay callable by service-role.
--    (No grants needed beyond the implicit ownership; this comment is
--    documentation only.)
--
--    If you later need to expose a single SELECT to anon for a new public
--    page, do it in a follow-up migration like:
--
--      GRANT SELECT ON public.<table> TO anon;
--      DROP POLICY deny_public ON public.<table>;
--      CREATE POLICY <name> ON public.<table>
--        FOR SELECT TO anon
--        USING (<your-condition>);
-- ----------------------------------------------------------------------------
