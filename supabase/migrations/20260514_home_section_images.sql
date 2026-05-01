-- Owner-controllable image grids for the four home-page service
-- sections (Haircuts, Color, Styling, Treatments). Phase 2 of the
-- branding work that started with /admin/branding singular slots —
-- with this table the home-page gallery rows are now DB-driven so
-- managers can swap photos without code changes.
--
-- Public surface: each row's image renders via the matching
-- ServiceGallery wrapper component (HaircutsGallery, ColorGallery,
-- etc.). The first row in sort_order acts as the section's hero
-- photo; the rest fill the grid. When this table has no rows for
-- a given section, the component falls back to its hardcoded
-- /public/images/... array — so a fresh install renders the same
-- as before this migration.
--
-- One row per photo. section is constrained to the four supported
-- categories so a typo can't end up writing to a section that no
-- component knows how to render.

create table if not exists public.home_section_images (
  id          uuid primary key default gen_random_uuid(),
  section     text not null check (section in ('haircuts', 'color', 'styling', 'treatments')),
  image_url   text not null,
  alt         text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_home_section_images_section_active_sort
  on public.home_section_images (section, active, sort_order);

alter table public.home_section_images enable row level security;

-- Public can read active rows (this is what the home-page server
-- components query at request time). Writes go through service-role
-- via /api/admin/branding/galleries which is gated by
-- requireAdminOrManager.
drop policy if exists "public read active home_section_images" on public.home_section_images;
create policy "public read active home_section_images"
  on public.home_section_images for select
  using (active = true);

-- Re-use the shared updated_at trigger if present (added in 20260420e).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    drop trigger if exists trg_set_updated_at on public.home_section_images;
    create trigger trg_set_updated_at before update on public.home_section_images
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

comment on table public.home_section_images is
  'Owner-managed image grids for the four home-page service sections (Haircuts/Color/Styling/Treatments). Driven from /admin/branding. Falls back to hardcoded images when empty.';
