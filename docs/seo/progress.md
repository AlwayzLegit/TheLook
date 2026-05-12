# SEO execution progress — May 2026 pass

Living record of what shipped on `claude/improve-website-seo-LybGl`.
Updated after each work package per the plan's section 9 convention.

---

## WP-A — Index consolidation & GSC reindex prep
**Status:** complete (owner action pending in GSC)
**Commit:** d87690c
**Files:** `docs/seo/index-consolidation.md` (new, 87 lines)

Live behavior verified on production:
- `http://thelookhairsalonla.com/` → 308 → canonical https://www. ✓
- `http://www.thelookhairsalonla.com/` → 308 → canonical https://www. ✓
- `https://thelookhairsalonla.com/` → 308 → canonical https://www. ✓
- `/services-1` → 308 → `/services` ✓
- `/about-1` → 308 → `/about` ✓
- `/services/item/balayage` → 308 → `/services/item/balayage-incl-toner` ✓
- Three renamed `/team/<slug>` rules also active.
- Strict-Transport-Security present and preload-eligible.

The Semrush "http://www. ranking with 712 monthly visits" line is stale
Google index, not a live serving bug. Action is a GSC URL Inspector
reindex push on the canonical URLs — owner does this once via the
checklist in the doc.

**Deviation from plan:** none. WP-01 from the plan is mostly already in
place at the infrastructure level.

---

## WP-B — AggregateRating from live external_reviews_cache
**Status:** complete
**Commit:** d87690c (combined with WP-A)
**Files changed:** `src/lib/seo.ts` (+40 / −2 lines)

Replaces the hard-coded `4.2 / 830` AggregateRating literal with a
read from `external_reviews_cache` (Google source) seeded daily by
`/api/cron/sync-reviews`. Conservative fallback to the old literal
when Supabase isn't configured or the row hasn't been seeded yet —
Google's structured-data validator strips an AggregateRating block
with no `reviewCount`.

Yelp is deliberately not blended into the schema number (Yelp's TOS
forbids syndicating ratings off-platform). Yelp rating still renders
in the visible badge component.

**Deviation from plan:** none.

---

## WP-C — Per-service FAQs + FAQPage JSON-LD
**Status:** complete
**Commit:** 92aeff5
**Files changed:** 2 files, +360 / −2 lines
- `supabase/migrations/20260523_service_faqs.sql` (new, 268 lines)
- `src/app/services/item/[slug]/page.tsx` (+60 / −2)

Added `service_faqs` table (Supabase, RLS-gated for anon read on
active rows). Service-item page fetches active FAQs in parallel with
stylists + related-services, renders them in an accessible
`<details>`/`<summary>` accordion, and emits FAQPage JSON-LD only when
at least one Q/A is rendered. Visible-content-required rule for FAQ
schema is enforced at the page level.

Seeded 13 priority service slugs (≈55 FAQ rows) covering the highest-
volume Semrush opportunities (haircut clusters, balayage, color,
highlights, extensions, keratin, blowouts/styling, eyebrow threading).
Seed is idempotent — re-runs are no-ops once any FAQ exists for a slug.

**Deviation from plan:** the plan specified "/services/balayage-glendale"
type parallel URLs (WP-04). We did NOT create those — the existing
/services/item/balayage-incl-toner is the canonical URL for that
service per the current IA, and creating a parallel URL would have
fragmented authority. Enrichment via FAQ table + JSON-LD on the
canonical URL delivers the same SEO outcome without the duplication
risk.

**Skipped:** bridal-specific FAQ pages (deferred per user instruction).

---

## WP-D — Neighborhood landing pages
**Status:** complete
**Commit:** 383798e
**Files changed:** 4 files, +776 lines
- `supabase/migrations/20260524_neighborhoods.sql` (new)
- `src/app/neighborhoods/[slug]/page.tsx` (new, 295 lines)
- `src/app/neighborhoods/page.tsx` (new, 124 lines)
- `src/app/sitemap.ts` (+33 / 0)

Built `/neighborhoods/[slug]` backed by `neighborhoods` +
`neighborhood_faqs` tables. Markdown bodies render through the existing
blog markdown pipeline (`renderMarkdown` from `@/lib/blog/markdown`).
Each page emits BreadcrumbList + FAQPage JSON-LD. Deliberately NOT
emitting a fresh LocalBusiness/HairSalon block — that would duplicate
the canonical org schema scoped to `/` per the round-9 QA fix.

Seeded 4 priority neighborhoods chosen from fresh Semrush US data
(May 2026):

| Slug | Combined vol | KD | Distance |
|---|---|---|---|
| `pasadena-hair-salon` | 1390 | 0.49 | 6 mi / 15 min |
| `burbank-hair-salon` | 850 | 0.51 | 3 mi / 10 min |
| `highland-park-hair-salon` | 630 | **0.27** | 6 mi / 15 min |
| `studio-city-hair-salon` | 410 | 0.62 | 8 mi / 15 min |

**Deviation from plan:** the original plan picked Burbank, Pasadena,
North Hollywood, Eagle Rock for the first batch. Fresh Semrush data
showed Highland Park (590 vol on "hair salon highland park" alone with
the lowest KD in the cohort) and Studio City (320 vol on "hair salon
studio city") both beat North Hollywood (170) and Eagle Rock (130). NH,
Eagle Rock, Sherman Oaks, Silver Lake, La Cañada, and Atwater Village
are queued for the WP-D phase-2 batch.

Each body is uniquely written (the plan's hard rule against doorway
content). Bridal angle deliberately omitted from every neighborhood
page.

Sitemap dynamic block + `/neighborhoods` hub URL both added.

---

## WP-E — Shared Breadcrumbs + nav/footer audit
**Status:** complete
**Commit:** 2b1f51a
**Files changed:** 5 files, +114 / −24 lines
- `src/components/Breadcrumbs.tsx` (new, 56 lines)
- `src/components/Navbar.tsx` (+ Facial Services to dropdown)
- `src/components/Footer.tsx` (+ Facial Services + Areas We Serve column)
- `src/app/services/item/[slug]/page.tsx` (use shared Breadcrumbs)
- `src/app/neighborhoods/[slug]/page.tsx` (use shared Breadcrumbs)

New `<Breadcrumbs>` component renders semantic `<nav aria-label="Breadcrumb">`
with `aria-current="page"` on the final item. JSON-LD breadcrumbs stay
in each caller via `breadcrumbJsonLd()` so the visible trail and the
structured data are always declared together (can't drift).

Nav: added `/services/facial-services` to the Services dropdown (was
in the sitemap + an indexed page, but had no nav entry — costing it
internal-link weight). Same fix on the footer Services column.

Footer: new "Areas We Serve" column with the 4 neighborhood pages.
Footer grid widened from `md:grid-cols-5` to `lg:grid-cols-6` with a
graceful sm:2 / md:3 fallback for tablets.

**Skipped:** refactoring the remaining inline breadcrumbs on
`/services/[slug]` and `/blog/[slug]` to use the new component. Both
are functional today and the refactor would balloon this PR. Left as
a follow-up.

---

## WP-F — Disavow file + citations playbook
**Status:** complete (owner action pending in GSC)
**Commit:** 3d12607
**Files changed:** 2 new files, +269 lines
- `docs/seo/disavow.txt` (Google Search Console disavow format)
- `docs/seo/citations.md` (owner action plan)

Pulled fresh `backlinks_refdomains` from Semrush (US, sorted by AS
ascending, top 100). Three distinct spam operators identifiable by IP
cluster:
- Singapore directory spam (118.139.x, 184.168.x) — 55 domains
- Moldova URL-shortener spam (195.20.19.x, 85.120.81.x) — 10 domains
- France blinks/knows/takes network (147.135.215.43) — 8 domains
- Misc topic-mismatched — 7 domains

Total ≈80 domains disavowed. Legitimate-but-low-AS referrers (jazz
musician page, possibly-real-LA-blogs, possibly-real-salon-directories)
are deliberately omitted with explanatory comments — a wrong disavow
costs us authority we earned.

Citations doc covers: canonical NAP (single source of truth from
`/admin/branding`), top-6 priority citations (Google Business Profile,
Yelp, Bing Places, Apple Business Connect, Yellow Pages, Foursquare),
secondary citations, industry + Glendale-local outreach targets
(Glendale Chamber, DowntownGlendale, Glendale News-Press, Harsanik),
quarterly hygiene checklist, and anti-patterns.

**Deviation from plan:** none.

---

## WP-G — PostHog explicit event tracking
**Status:** complete
**Commit:** e5c3b5f
**Files changed:** 7 files, +166 / −22 lines
- `src/components/TrackedLink.tsx` (new — TrackedLink + TrackedAnchor)
- `src/components/MobileBookButton.tsx`
- `src/components/Footer.tsx`
- `src/components/Navbar.tsx`
- `src/components/Contact.tsx` (incl. new "Get directions" link)
- `src/app/services/item/[slug]/page.tsx`
- `src/app/neighborhoods/[slug]/page.tsx`

Wired explicit named events on every primary CTA:
- `book_click` — sources: `mobile_sticky` | `navbar_desktop` |
  `navbar_mobile` | `footer_cta` | `service_item_hero` |
  `neighborhood_hero` | `neighborhood_footer_cta`, plus
  `service_slug` / `neighborhood_slug` properties where applicable.
- `phone_click` — sources: `footer_cta` | `footer_contact_block` |
  `navbar_mobile` | `contact_page`.
- `directions_click` — source: `contact_page`. Added a missing
  "Get directions" link below the embedded map (the iframe can't
  launch driving directions on mobile, the new link can).

PostHog autocapture continues to record `$pageview` events with the
URL, so service-page views are still tracked under the page_view
event without a separate `service_page_view` event.

**Deviation from plan:** none.

---

## Owner punch list (post-deploy)

Once this branch is merged and the Vercel deploy is live:

1. Apply the two new Supabase migrations (run in order):
   - `20260523_service_faqs.sql`
   - `20260524_neighborhoods.sql`
2. Confirm the FAQ accordion renders on a service-item page that has
   seeded FAQs (e.g. `/services/item/balayage-incl-toner`).
3. Confirm a neighborhood page renders (e.g. `/neighborhoods/pasadena-hair-salon`).
4. Validate schema:
   - Run https://search.google.com/test/rich-results on
     `https://www.thelookhairsalonla.com/services/item/balayage-incl-toner`
     and confirm Service + FAQ rich-result eligibility.
   - Run the same against `/neighborhoods/pasadena-hair-salon` and
     confirm Breadcrumb + FAQ are detected.
5. Upload `docs/seo/disavow.txt` via Google Search Console →
   Disavow Links Tool against the canonical property.
6. Run the GSC reindex requests listed in `docs/seo/index-consolidation.md`.
7. Work through `docs/seo/citations.md` — start with the top-6 free
   listings, defer the rest.
8. Wait 14 days; re-run Semrush organic_research and compare to the
   baseline captured in the chat where this work was planned.
