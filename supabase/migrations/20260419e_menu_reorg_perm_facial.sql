-- ============================================================================
-- Menu reorg — Perm + Facial Hair Removal under Treatments
-- Run in Supabase SQL Editor. Idempotent. Safe to re-run.
-- ============================================================================

-- 1. Move Perm to the Treatments category.
UPDATE public.services
   SET category = 'Treatments',
       updated_at = NOW()
 WHERE name = 'Perm'
   AND category = 'Perms & More';

-- 2. Rename "Facial Hair Removal (thread/wax)" → "Facial Hair Removal" and
--    move it into Treatments too. The variants below spell out the areas,
--    so the (thread/wax) suffix is no longer useful on the service name.
--    Slug is left untouched so any existing links keep working.
UPDATE public.services
   SET name = 'Facial Hair Removal',
       category = 'Treatments',
       updated_at = NOW()
 WHERE name IN ('Facial Hair Removal', 'Facial Hair Removal (thread/wax)')
   AND category = 'Perms & More';

-- 3. Add the 5 area variants on Facial Hair Removal. Each inherits the
--    parent service's current price_text/price_min/duration so nothing is
--    accidentally free or instant — you'll edit each row's price and
--    duration in Admin → Services → Edit "Facial Hair Removal" →
--    Variants / areas. Skipped cleanly if variants already exist.
INSERT INTO public.service_variants (
  service_id, name, price_text, price_min, duration, active, sort_order
)
SELECT s.id, v.name, s.price_text, s.price_min, s.duration, TRUE, v.sort_order
  FROM public.services s
  CROSS JOIN (VALUES
    ('Eyebrows',  1),
    ('Full face', 2),
    ('Upper lip', 3),
    ('Chin',      4),
    ('Neck',      5)
  ) AS v(name, sort_order)
 WHERE s.name = 'Facial Hair Removal'
   AND s.category = 'Treatments'
   AND NOT EXISTS (
     SELECT 1
       FROM public.service_variants sv
      WHERE sv.service_id = s.id
        AND sv.name = v.name
   );

-- ---------------------------------------------------------------------------
-- Sanity check — uncomment to see the result.
-- SELECT name, category, price_text, duration FROM public.services
--  WHERE name IN ('Perm', 'Facial Hair Removal') ORDER BY name;
-- SELECT sv.name, sv.price_text, sv.duration
--   FROM public.service_variants sv
--   JOIN public.services s ON s.id = sv.service_id
--  WHERE s.name = 'Facial Hair Removal'
--  ORDER BY sv.sort_order;
