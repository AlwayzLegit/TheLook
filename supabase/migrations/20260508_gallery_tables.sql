-- Admin-managed gallery content.
--
-- Two sibling tables, both publicly readable (active rows only), admin-
-- writable via the service-role key used by the /api/admin/gallery
-- endpoints. Mirrors how salon_settings is handled elsewhere: no per-user
-- permissions, just a boolean "active" flag + ordering.
--
-- gallery_items   — rows that populate the main grid on /gallery.
-- gallery_before_after — rows that populate the new Before / After
--                        section on /gallery (previously driven by a
--                        hardcoded src/lib/beforeAfterPairs.ts stub).

CREATE TABLE IF NOT EXISTS public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gallery_before_after (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  before_url text NOT NULL,
  after_url text NOT NULL,
  caption text,
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_active_sort
  ON public.gallery_items (active, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_before_after_active_sort
  ON public.gallery_before_after (active, sort_order);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_before_after ENABLE ROW LEVEL SECURITY;

-- Public can only read active rows. Admin writes go through the service
-- role, which bypasses RLS, so no separate admin policy is needed.
DROP POLICY IF EXISTS "public read active gallery_items" ON public.gallery_items;
CREATE POLICY "public read active gallery_items"
  ON public.gallery_items FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "public read active gallery_before_after" ON public.gallery_before_after;
CREATE POLICY "public read active gallery_before_after"
  ON public.gallery_before_after FOR SELECT
  USING (active = true);

-- Seed the 17 existing public/images/gallery/gallery-*.jpg tiles so the
-- /gallery page looks identical the moment the admin UI goes live. Owner
-- can then edit / reorder / retitle / toggle active from /admin/gallery.
-- Gated on empty table so re-running the migration is a no-op.
INSERT INTO public.gallery_items (image_url, title, caption, sort_order)
SELECT * FROM (VALUES
  ('/images/gallery/gallery-01.jpg', 'Balayage Transformation', 'Color',     10),
  ('/images/gallery/gallery-02.jpg', 'Precision Cut & Style',   'Cut',       20),
  ('/images/gallery/gallery-03.jpg', 'Color & Highlights',      'Color',     30),
  ('/images/gallery/gallery-04.jpg', 'Blonde Highlights',       'Color',     40),
  ('/images/gallery/gallery-05.jpg', 'Hair Styling',            'Styling',   50),
  ('/images/gallery/gallery-06.jpg', 'Vivid Color',             'Color',     60),
  ('/images/gallery/gallery-07.jpg', 'Textured Layers',         'Cut',       70),
  ('/images/gallery/gallery-08.jpg', 'Ombré',                   'Color',     80),
  ('/images/gallery/gallery-09.jpg', 'Full Color',              'Color',     90),
  ('/images/gallery/gallery-10.jpg', 'Blowout & Style',         'Styling',  100),
  ('/images/gallery/gallery-11.jpg', 'Color Correction',        'Color',    110),
  ('/images/gallery/gallery-12.jpg', 'Cut & Color',             'Color',    120),
  ('/images/gallery/gallery-13.jpg', 'Highlights & Toner',      'Color',    130),
  ('/images/gallery/gallery-14.jpg', 'Layered Cut',             'Cut',      140),
  ('/images/gallery/gallery-15.jpg', 'Keratin Smoothing',       'Treatment', 150),
  ('/images/gallery/gallery-16.jpg', 'Blowout Waves',           'Styling',  160),
  ('/images/gallery/gallery-17.jpg', 'Finished Look',           'Styling',  170)
) AS v(image_url, title, caption, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.gallery_items);
