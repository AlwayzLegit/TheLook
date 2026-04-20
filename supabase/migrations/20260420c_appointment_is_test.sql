-- B-27 — soft test-data flag for appointments.
--
-- Why: hard-deleting test rows loses history (no-show patterns, audit
-- trail, debugging context). Soft-flagging them with is_test lets every
-- production read path filter them out while keeping the data on hand.
-- Dashboards, analytics, commission calcs, and email-send paths must
-- treat is_test=true rows as nonexistent.
--
-- Bookings created from the website default to is_test=false. The admin
-- UI exposes a checkbox on the manual booking form for ops to mark
-- intentional test rows as such.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_appointments_is_test
  ON public.appointments(is_test)
  WHERE is_test = true;

-- Admins can manually mark known test rows ahead of launch by running:
--   UPDATE public.appointments SET is_test = true WHERE id IN ('...');
