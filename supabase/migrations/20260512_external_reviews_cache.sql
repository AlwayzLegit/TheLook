-- DB-backed cache for external review APIs (Google Places, Yelp Fusion).
--
-- Why this exists:
--   The /api/{google,yelp}-reviews routes used to keep a 6-hour
--   in-memory cache. Vercel serverless functions cold-start frequently
--   so that cache was effectively per-instance — the first visitor
--   after a cold start always paid the API round-trip, and after API
--   keys were rotated/disabled we had no way to know how stale the
--   numbers were. This table lets a daily cron prefill the cache so
--   public visitors never pay the API cost AND the admin can see the
--   last successful sync timestamp + any error.
--
-- One row per source. `source` is the natural key. UPSERT every sync.
-- Reviews are stored as JSONB with the same shape /api/*-reviews
-- already returns to the client, so the public route can pass the
-- payload straight through.

create table if not exists public.external_reviews_cache (
  source            text primary key check (source in ('google', 'yelp')),
  rating            numeric(3,2),
  total_count       integer,
  reviews           jsonb not null default '[]'::jsonb,
  fetched_at        timestamptz not null default now(),
  last_success_at   timestamptz,
  last_error        text,
  last_error_at     timestamptz,
  updated_at        timestamptz not null default now()
);

-- Read access for the service-role-key fetches our public API routes
-- make. RLS off — every read goes through a server route that
-- already gates the response shape, so no client touches this table
-- directly.
alter table public.external_reviews_cache disable row level security;

comment on table public.external_reviews_cache is
  'Daily-refreshed cache of Google Places + Yelp Fusion review payloads. One row per source. Read by /api/{google,yelp}-reviews; written by /api/cron/sync-reviews and the admin manual-refresh endpoint.';
