-- Manager role + public profile columns on admin_users.
--
-- Three shape changes in one migration so the app can ship them atomically:
--
--   1. Widen the admin_users.role check to accept 'manager'. The existing
--      'admin' and 'stylist' values keep working; only the new 'manager'
--      value is added. (Stylist role is still disabled in UI but kept for
--      forward compat with the original schema.)
--
--   2. Add public-facing profile columns on admin_users so managers (and
--      optionally admins) can surface on the /team page with their own
--      bio + photo + title. Everyone starts hidden (active_for_public
--      defaults to false) — the owner toggles visibility per-user from
--      their /admin/profile page.
--
--   3. Unique partial index on slug so /team/<slug> routes are
--      unambiguous when we add per-user detail pages later. NULL slugs
--      allowed and unconstrained.

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'manager', 'stylist'));

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS active_for_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_slug
  ON public.admin_users (slug)
  WHERE slug IS NOT NULL;

-- Helpful for the /team page fetch.
CREATE INDEX IF NOT EXISTS idx_admin_users_public_sort
  ON public.admin_users (active_for_public, sort_order)
  WHERE active_for_public = true;
