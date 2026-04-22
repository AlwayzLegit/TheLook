-- QA reverify P1-#1 — `appointment_services.duration_minutes` is a
-- legacy NOT NULL column with no default that none of the repo's code
-- reads from. It pre-dates the booking-time snapshot migration; the
-- newer code writes to `duration` instead. Until this migration ran,
-- every public booking failed with:
--   null value in column "duration_minutes" of relation
--   "appointment_services" violates not-null constraint
--
-- Code in PR K already populates both `duration` and `duration_minutes`
-- defensively so bookings work without this migration. This migration
-- removes the constraint so future schema changes don't have to
-- maintain the duplicate column.

ALTER TABLE public.appointment_services
  ALTER COLUMN duration_minutes DROP NOT NULL;
