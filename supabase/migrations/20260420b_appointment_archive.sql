-- Archive + 30-day auto-purge system for appointments.
--
-- Why: salon owner wants to "delete or archive" cancelled appointments and
-- have them auto-delete 30 days later. Hard-deleting immediately loses
-- history (no-show tracking, client "X appointments" counts, audit trail).
-- Instead we soft-archive by stamping archived_at, hide those rows from
-- every active admin view, and purge them after 30 days.
--
-- Only cancelled / no_show / completed appointments should be archivable —
-- pending and confirmed are still actionable and must stay visible.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_appointments_archived_at
  ON public.appointments(archived_at)
  WHERE archived_at IS NOT NULL;

-- Callable from admin list endpoints as a lightweight lazy cron. Returns
-- the number of rows deleted so we can log purges.
CREATE OR REPLACE FUNCTION public.fn_purge_archived_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  purged integer;
BEGIN
  WITH del AS (
    DELETE FROM public.appointments
    WHERE archived_at IS NOT NULL
      AND archived_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO purged FROM del;
  RETURN purged;
END;
$$;

-- Only service-role should execute this — RLS keeps anon out.
REVOKE ALL ON FUNCTION public.fn_purge_archived_appointments() FROM public;
REVOKE ALL ON FUNCTION public.fn_purge_archived_appointments() FROM anon;
REVOKE ALL ON FUNCTION public.fn_purge_archived_appointments() FROM authenticated;
