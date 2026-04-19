-- ============================================================================
-- Per-service detail pages need a URL slug plus long-form copy. This
-- migration adds slug / description / products_used to the services table
-- and backfills slugs for everything that already exists. Idempotent.
-- ============================================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS slug VARCHAR(160);

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS products_used TEXT;

-- Backfill slugs for existing services. Lowercase the name, strip non-alnum,
-- collapse dashes. We add the last 6 chars of the UUID when there's a
-- collision so duplicate names still get distinct slugs.
WITH slugged AS (
  SELECT
    id,
    name,
    lower(regexp_replace(
      regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    )) AS base_slug,
    row_number() OVER (
      PARTITION BY lower(regexp_replace(
        regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'
      ))
      ORDER BY created_at
    ) AS rn
  FROM services
  WHERE slug IS NULL OR slug = ''
)
UPDATE services s
SET slug = CASE
  WHEN slugged.rn = 1 THEN slugged.base_slug
  ELSE slugged.base_slug || '-' || substring(s.id::text, 1, 6)
END
FROM slugged
WHERE s.id = slugged.id;

-- Unique index once backfill is clean.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_services_slug ON services(slug);
