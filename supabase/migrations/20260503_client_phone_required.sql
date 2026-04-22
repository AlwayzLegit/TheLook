-- QA audit P2-5 — enforce client_phone at the schema level.
--
-- All booking surfaces (public /book, admin New Appointment) now require
-- a 7+ digit phone number, validated at the zod layer before insert.
-- This migration backfills any legacy NULLs to an empty string so the
-- NOT NULL constraint can be applied without data loss, then flips the
-- column. contact_messages.phone stays nullable — the contact form is
-- intentionally low-friction.

UPDATE public.appointments SET client_phone = '' WHERE client_phone IS NULL;
ALTER TABLE public.appointments
  ALTER COLUMN client_phone SET DEFAULT '',
  ALTER COLUMN client_phone SET NOT NULL;
