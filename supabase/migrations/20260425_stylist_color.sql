-- Phase 0 — stylist.color for the shared chart palette.
--
-- Stored as a hex string (#RRGGBB) pointing at one of the 6 chart slots
-- defined in src/app/globals.css. When NULL, the UI derives a stable
-- fall-back from the stylist's name so freshly-added stylists still get a
-- consistent colour without requiring admin input.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.stylists
  ADD COLUMN IF NOT EXISTS color varchar(9);

-- Seed the five current stylists with the palette so calendars + charts
-- stop defaulting to the single-colour look. Only fills NULLs — admin
-- edits win next time.
DO $$
BEGIN
  UPDATE public.stylists SET color = '#1d1f2e' WHERE lower(name) LIKE 'armen%'    AND color IS NULL;
  UPDATE public.stylists SET color = '#c43353' WHERE lower(name) LIKE 'jasmine%'  AND color IS NULL;
  UPDATE public.stylists SET color = '#b48a3c' WHERE lower(name) LIKE 'kristina%' AND color IS NULL;
  UPDATE public.stylists SET color = '#7c9a7a' WHERE lower(name) LIKE 'janet%'    AND color IS NULL;
  UPDATE public.stylists SET color = '#c98a9a' WHERE lower(name) LIKE 'alisa%'    AND color IS NULL;
END;
$$;
