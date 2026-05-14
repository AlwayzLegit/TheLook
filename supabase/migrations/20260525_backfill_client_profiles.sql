-- Backfill missing client_profiles rows from appointments.
--
-- Why: until 20260514, the admin appointment-create flow
-- (POST /api/admin/appointments) inserted into appointments without
-- also upserting into client_profiles. The public /api/appointments
-- POST has always done that upsert; only the admin path was missing it.
--
-- Symptom: clients added by admin (typically with a phone-only contact
-- and a synthetic phone-XXX@noemail.thelookhairsalonla.com email) show
-- up on the calendar / appointment list but are absent from
-- /admin/clients search and from any directory query that joins
-- through client_profiles.
--
-- Fix forward: code change in /api/admin/appointments POST also adds
-- the upsert. This migration retroactively heals the orphan rows.
--
-- Strategy:
--   1. For each distinct client_email in appointments that has NO
--      matching client_profiles row, take the most-recent appointment
--      row's client_name + client_phone as the profile values.
--   2. INSERT only — never overwrite an existing profile (so admin
--      edits to client_profiles are never clobbered by stale
--      appointment snapshots).
--
-- Idempotent: re-running this is a no-op once every appointment email
-- has a matching profile.

INSERT INTO public.client_profiles (email, name, phone, created_at, updated_at)
SELECT
  lower(latest.client_email)                         AS email,
  latest.client_name                                  AS name,
  NULLIF(trim(latest.client_phone), '')               AS phone,
  now()                                               AS created_at,
  now()                                               AS updated_at
FROM (
  SELECT DISTINCT ON (lower(a.client_email))
    a.client_email,
    a.client_name,
    a.client_phone
  FROM public.appointments a
  WHERE a.client_email IS NOT NULL
    AND a.client_email <> ''
    AND a.client_name IS NOT NULL
    AND a.client_name <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM public.client_profiles cp
      WHERE lower(cp.email) = lower(a.client_email)
    )
  ORDER BY lower(a.client_email), a.created_at DESC
) latest
ON CONFLICT (email) DO NOTHING;
