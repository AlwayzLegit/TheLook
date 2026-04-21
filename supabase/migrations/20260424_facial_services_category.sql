-- Split "Facial Services" out into its own category so it stops living
-- inside Treatments. Customers browsing the menu see it as a distinct
-- section, which matches how it's actually offered.
--
-- Idempotent: updating rows already in "Facial Services" is a no-op.

UPDATE public.services
   SET category = 'Facial Services',
       updated_at = now()
 WHERE category IN ('Treatments', 'Facial Services')
   AND (
        name ILIKE '%facial hair removal%'
     OR name ILIKE '%eyebrow%'
     OR name ILIKE '%brow tint%'
     OR name ILIKE '%threading%'
     OR name ILIKE '%waxing%'
   );
