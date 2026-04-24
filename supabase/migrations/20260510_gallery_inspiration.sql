-- Admin-managed "inspiration" gallery — trend / style reference photos the
-- owner uploads so clients can browse current looks before their visit.
-- Kept separate from gallery_items (salon's own portfolio) because the
-- semantics are different: these are aspirational references, not finished
-- work from our chairs, and they rotate more often.
--
-- Category + gender let the public page filter the grid. Source is free
-- text so the owner can credit the original (instagram handle, pinterest,
-- etc.) since these are usually not her own photos.

CREATE TABLE IF NOT EXISTS public.gallery_inspiration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  caption text,
  -- Broad bucket for the public filter chips on /gallery. Free-text but
  -- the admin UI offers a preset dropdown (Cuts / Color / Styling /
  -- Treatments / Other) so data stays tidy.
  category varchar(40),
  -- "women" | "men" | "unisex". Used as the second filter axis.
  gender varchar(10),
  -- Optional credit line ("@hairsalonla", "pinterest", "photographer name").
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_inspiration_active_sort
  ON public.gallery_inspiration (active, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_inspiration_gender_category
  ON public.gallery_inspiration (gender, category)
  WHERE active = true;

ALTER TABLE public.gallery_inspiration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active gallery_inspiration" ON public.gallery_inspiration;
CREATE POLICY "public read active gallery_inspiration"
  ON public.gallery_inspiration FOR SELECT
  USING (active = true);
