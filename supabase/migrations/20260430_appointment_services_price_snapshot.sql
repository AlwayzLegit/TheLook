-- Capture price_min + duration at the moment a booking is created so
-- historical revenue doesn't shift if the owner later edits a service's
-- price or duration. Without this, last month's dashboard total silently
-- changes the moment a service is retitled + repriced.
--
-- Design:
--   - Nullable columns so existing rows don't need immediate values.
--   - Backfill from the linked service + variant. Variant price/duration
--     overrides the parent service when the booking picked a variant.
--   - Code callers (booking POST routes) start writing both columns
--     going forward; the dashboard + analytics queries fall back to
--     services.price_min when these columns are null.

ALTER TABLE public.appointment_services
  ADD COLUMN IF NOT EXISTS price_min integer,
  ADD COLUMN IF NOT EXISTS duration integer;

-- Backfill legacy rows. Variant values take precedence because that's
-- what the booking flow actually charged for.
UPDATE public.appointment_services aps
SET
  price_min = COALESCE(v.price_min, s.price_min),
  duration  = COALESCE(v.duration,  s.duration)
FROM public.services s
LEFT JOIN public.service_variants v ON v.id = aps.variant_id
WHERE aps.service_id = s.id
  AND (aps.price_min IS NULL OR aps.duration IS NULL);
