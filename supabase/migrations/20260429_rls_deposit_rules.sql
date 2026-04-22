-- Lock deposit_rules behind RLS to match every other public table.
-- Matches the pattern established in 20260420d_lockdown_grants_and_policies:
-- a deny-all restrictive policy for anon + authenticated, while the
-- service-role key used by the admin API bypasses RLS entirely.

ALTER TABLE public.deposit_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_public ON public.deposit_rules;
CREATE POLICY deny_public
  ON public.deposit_rules
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Revoke direct grants for parity with the other locked-down tables.
-- Service-role key (used by /api/admin/deposit-rules and
-- /api/deposits/rules) bypasses both grants and RLS, so no admin path
-- breaks. Public /api/deposits/rules goes through the server-side
-- Supabase client, so it's unaffected.
REVOKE ALL ON TABLE public.deposit_rules FROM anon;
REVOKE ALL ON TABLE public.deposit_rules FROM authenticated;
