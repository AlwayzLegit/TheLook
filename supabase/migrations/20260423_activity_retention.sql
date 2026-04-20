-- Admin activity log retention. Security + storage hygiene:
--   auth events, booking edits, and settings changes accumulate quickly.
--   180 days is long enough to cover a typical dispute window and short
--   enough to keep the table scannable.
--
-- The cron route at /api/cron/purge-activity-log calls this function.

CREATE OR REPLACE FUNCTION public.fn_purge_old_admin_log(retain_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  purged integer;
BEGIN
  DELETE FROM public.admin_log
  WHERE created_at < now() - (retain_days || ' days')::interval;
  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_purge_old_admin_log(integer) FROM public;
REVOKE ALL ON FUNCTION public.fn_purge_old_admin_log(integer) FROM anon;
REVOKE ALL ON FUNCTION public.fn_purge_old_admin_log(integer) FROM authenticated;

-- Supporting index so the scan stays cheap even as the table grows.
CREATE INDEX IF NOT EXISTS idx_admin_log_created_at
  ON public.admin_log(created_at DESC);
