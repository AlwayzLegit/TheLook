-- Blog: categories + posts + RLS + seed.
--
-- Public-read content drop for SEO marketing. Posts are authored in
-- /admin/blog and rendered at /blog, /blog/[slug], /blog/category/[slug].
-- A Claude routine on the owner's side will publish daily; the API
-- accepts slug-keyed upserts so re-runs are idempotent.
--
-- Scheduling is handled at read time, not by a cron: the public
-- selector treats `status='scheduled' AND scheduled_for <= now()`
-- the same as `status='published'`, so a post just appears when its
-- scheduled time arrives without needing a separate worker.
--
-- Author identity defaults to "The Look Hair Salon" — the salon's
-- brand byline. The author_name / author_avatar_url columns are
-- written rarely; we keep them on the row instead of joining to
-- admin_users so a Claude-authored post never accidentally surfaces
-- a real admin's name on the public site.

-- ---------------------------------------------------------------
-- blog_categories
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  cover_image_url text,
  meta_title      text,
  meta_description text,
  sort_order      integer NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_categories_active_sort
  ON public.blog_categories (active, sort_order);

-- ---------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  title               text NOT NULL,
  excerpt             text,
  -- Markdown source. Rendered to sanitized HTML at request time
  -- via the remark/rehype pipeline in src/lib/blog/markdown.ts
  -- and cached at the page level (Next ISR + BLOG_CACHE_TAG).
  content_md          text NOT NULL,
  cover_image_url     text,
  cover_image_alt     text,
  category_id         uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  -- Brand byline by default; set per-post for guest authors.
  author_name         text NOT NULL DEFAULT 'The Look Hair Salon',
  author_avatar_url   text,
  status              text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  published_at        timestamptz,
  scheduled_for       timestamptz,
  -- SEO overrides — fall back to title / excerpt / cover when null.
  meta_title          text,
  meta_description    text,
  canonical_url       text,
  og_image_url        text,
  -- Auto-computed on insert/update via trigger below; manual
  -- override stays untouched if non-null.
  reading_time_minutes integer,
  tags                text[] NOT NULL DEFAULT '{}',
  is_featured         boolean NOT NULL DEFAULT false,
  view_count          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Public list query: status published OR (scheduled and time has
-- passed), ordered by published_at desc. Indexed for that path.
CREATE INDEX IF NOT EXISTS idx_blog_posts_public_listing
  ON public.blog_posts (published_at DESC NULLS LAST)
  WHERE status IN ('published', 'scheduled');

CREATE INDEX IF NOT EXISTS idx_blog_posts_category_listing
  ON public.blog_posts (category_id, published_at DESC NULLS LAST)
  WHERE status IN ('published', 'scheduled');

CREATE INDEX IF NOT EXISTS idx_blog_posts_status
  ON public.blog_posts (status);

-- ---------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_categories_updated_at ON public.blog_categories;
CREATE TRIGGER trg_blog_categories_updated_at
BEFORE UPDATE ON public.blog_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- Reading-time estimator (~220 words per minute, min 1).
-- Triggered before insert/update so the column stays in sync with
-- whatever the editor saved. Manual overrides win: only auto-fill
-- when the column is NULL.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.blog_post_reading_time()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  word_count integer;
BEGIN
  IF NEW.reading_time_minutes IS NOT NULL AND NEW.reading_time_minutes > 0 THEN
    RETURN NEW;
  END IF;
  word_count := array_length(regexp_split_to_array(coalesce(NEW.content_md, ''), '\s+'), 1);
  IF word_count IS NULL THEN word_count := 0; END IF;
  NEW.reading_time_minutes := GREATEST(1, ceil(word_count::numeric / 220));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_reading_time ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_reading_time
BEFORE INSERT OR UPDATE OF content_md, reading_time_minutes
ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.blog_post_reading_time();

-- ---------------------------------------------------------------
-- RLS: anon SELECT only the rows the public site renders. Admin
-- writes go through service-role (the API route checks the session
-- before touching the DB), so anon writes / authenticated reads are
-- both denied via the deny_public restrictive policy.
-- ---------------------------------------------------------------
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read active blog categories" ON public.blog_categories;
CREATE POLICY "Anon can read active blog categories"
  ON public.blog_categories
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Anon can read public blog posts" ON public.blog_posts;
CREATE POLICY "Anon can read public blog posts"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    OR (status = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= now())
  );

-- Restrictive deny — same shape as the rest of the schema. Stops a
-- future permissive policy from accidentally exposing draft rows.
DROP POLICY IF EXISTS deny_public ON public.blog_categories;
CREATE POLICY deny_public ON public.blog_categories
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_update ON public.blog_categories;
CREATE POLICY deny_public_update ON public.blog_categories
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_delete ON public.blog_categories;
CREATE POLICY deny_public_delete ON public.blog_categories
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS deny_public ON public.blog_posts;
CREATE POLICY deny_public ON public.blog_posts
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_update ON public.blog_posts;
CREATE POLICY deny_public_update ON public.blog_posts
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_delete ON public.blog_posts;
CREATE POLICY deny_public_delete ON public.blog_posts
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);

-- ---------------------------------------------------------------
-- Seed four starter categories. ON CONFLICT (slug) DO NOTHING so a
-- re-run of the migration doesn't overwrite owner-edited copy.
-- ---------------------------------------------------------------
INSERT INTO public.blog_categories (slug, name, description, sort_order)
VALUES
  ('hair-care-tips', 'Hair Care Tips',
   'Practical advice from our stylists on keeping your hair healthy at home — washing, heat protection, products, and seasonal upkeep.',
   1),
  ('color-trends', 'Color Trends',
   'Balayage, ombré, fashion colors and the looks our color specialists are seeing trend in Glendale this season.',
   2),
  ('styling-guides', 'Styling Guides',
   'Step-by-step styling tutorials and inspiration for every occasion — from everyday blowouts to wedding-ready updos.',
   3),
  ('salon-news', 'Salon News',
   'Updates from The Look — new services, team announcements, events, and behind-the-scenes from the chair.',
   4)
ON CONFLICT (slug) DO NOTHING;
