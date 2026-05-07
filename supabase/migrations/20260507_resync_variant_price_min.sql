-- Resync service_variants.price_min from price_text.
--
-- Problem: migration 20260419e_menu_reorg_perm_facial.sql seeded every
-- Facial Hair Removal variant with the parent service's price_text
-- ("$5+") AND price_min (500 cents). The owner later edited the
-- visible price_text in /admin/services to set per-area pricing
-- ($25 brow, $35 full face, etc.) but the editor exposed price_min
-- as a separate input, so the cents column kept its 500-cent stale
-- value. /book's footer summed the stale cents → customers saw $5
-- totals on $25 services. QA flagged this 2026-05-07.
--
-- This migration parses the first dollar amount out of price_text and
-- updates price_min only when the derived value differs from what's
-- stored. Mirrors lib/priceText.ts so the SQL fix and runtime
-- safety-net agree on parsing rules.
--
-- Idempotent: safe to re-run.

UPDATE public.service_variants
SET price_min = derived.cents
FROM (
  SELECT
    id,
    ROUND((substring(price_text from '[0-9]+(\.[0-9]{1,2})?'))::numeric * 100)::integer AS cents
  FROM public.service_variants
  WHERE price_text ~ '[0-9]+(\.[0-9]{1,2})?'
) AS derived
WHERE service_variants.id = derived.id
  AND derived.cents IS NOT NULL
  AND service_variants.price_min IS DISTINCT FROM derived.cents;
