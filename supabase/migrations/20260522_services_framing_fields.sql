-- Per-service framing copy for the public detail page
-- (/services/item/<slug>). Until this migration the three framing
-- blurbs — "What to expect", "Recommended frequency", and "Pair with"
-- — came from a hardcoded per-category map in
-- src/app/services/item/[slug]/page.tsx, so every Color service shared
-- one paragraph, every Haircut service shared another, etc. That was
-- misleading: a $35 Bangs trim and a $250 balayage shouldn't promise
-- the same "anywhere from 90 minutes to four hours of chair time".
--
-- Each column is nullable. The detail page falls back to the existing
-- per-category copy when a column is null/empty, so this migration is
-- non-breaking — services without owner-curated text continue to
-- render the legacy framing until /admin/services is used to fill them
-- in.

alter table public.services
  add column if not exists what_to_expect text,
  add column if not exists recommended_frequency text,
  add column if not exists pair_with text;
