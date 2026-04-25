-- Tag gallery photos with the stylist whose work they showcase. Optional —
-- existing rows stay NULL ("salon-wide") and behave exactly as before.
-- Tagged rows surface in two new ways:
--   1. A new dropdown filter on /gallery narrows the main grid + before/
--      after carousel to a single stylist's work.
--   2. /team/[slug] gets a "Selected work" section pulling from these
--      tables filtered by stylist_id.
--
-- ON DELETE SET NULL is intentional — if a stylist record is deleted we
-- don't want to lose the photos with them. They demote back to
-- salon-wide instead.

ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS stylist_id uuid REFERENCES public.stylists(id) ON DELETE SET NULL;

ALTER TABLE public.gallery_before_after
  ADD COLUMN IF NOT EXISTS stylist_id uuid REFERENCES public.stylists(id) ON DELETE SET NULL;

-- Partial indexes — most queries care only about active rows tagged to a
-- specific stylist, so the index footprint matches access patterns
-- without paying for archived/deleted rows.
CREATE INDEX IF NOT EXISTS idx_gallery_items_stylist_active
  ON public.gallery_items (stylist_id)
  WHERE active = true AND stylist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_before_after_stylist_active
  ON public.gallery_before_after (stylist_id)
  WHERE active = true AND stylist_id IS NOT NULL;
