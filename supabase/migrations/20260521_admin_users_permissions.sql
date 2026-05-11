-- Replace the hardcoded admin / manager / stylist role enum with a free-form
-- title + an explicit permissions array. Owner can now create users with a
-- custom title ("Receptionist", "Lead Color Specialist", …) and check exactly
-- which capability each user gets.
--
-- The legacy `role` column is kept in place and unchanged for backward
-- compatibility — the new code paths read `permissions` first, but
-- pre-deploy sessions still resolve through `role`. A later cleanup
-- migration will drop the `role` column once we're confident no shipped
-- code depends on it.

-- 1. Permissions array. text[] not jsonb because every value is a short
-- catalogue string and Postgres array contains-checks (`'manage_users' = ANY(permissions)`)
-- are simpler in policies + queries than jsonb_path_exists.
alter table public.admin_users
  add column if not exists permissions text[] not null default '{}';

-- 2. Backfill permissions from existing role:
--   admin    → all 8 permissions
--   manager  → all 8 except manage_users (matches the requested
--              "managers can do everything except create/delete users")
--   stylist  → empty (stylist accounts don't reach the admin shell)
--
-- Idempotent: only writes when permissions is currently empty so a
-- re-run after manual edits in /admin/users doesn't clobber custom
-- assignments.
update public.admin_users
set permissions = array[
  'manage_users',
  'manage_settings',
  'view_analytics',
  'manage_bookings',
  'manage_clients',
  'manage_content',
  'manage_catalog',
  'manage_team'
]::text[]
where role = 'admin' and (permissions is null or array_length(permissions, 1) is null);

update public.admin_users
set permissions = array[
  'manage_settings',
  'view_analytics',
  'manage_bookings',
  'manage_clients',
  'manage_content',
  'manage_catalog',
  'manage_team'
]::text[]
where role = 'manager' and (permissions is null or array_length(permissions, 1) is null);

-- 3. GIN index for `'foo' = ANY(permissions)` lookups. Tiny table today
-- (≤10 rows) but the index keeps row-level checks O(log n) once we add
-- per-permission RLS policies down the road.
create index if not exists admin_users_permissions_idx
  on public.admin_users using gin (permissions);
