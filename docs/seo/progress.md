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

## WP-H — Post-audit admin + content fixes
**Status:** complete, shipped to production
**PRs:** #47, #48, #49

Owner-reported items handled between SEO work packages:

- **#47** — homepage About badge copy: "14+ Years of Excellence" →
  "15+ Years of Passion and Expertise" (`src/components/About.tsx`).
  Salon founded 11.11.11, so 15+ is accurate.
- **#48** — `AppointmentActionsModal` "+ Add service…" picker grouped
  by category via `<optgroup>` (Haircuts → Color & Highlights →
  Styling → Treatments → Facial Services; unknown/empty → "Other").
  `Service` / `ServiceCatalogOption` gained a `category` field; the
  admin services API already returned it via `SELECT *`.
- **#49** — three fixes in one:
  1. **Missing client_profiles.** Admin `POST /api/admin/appointments`
     never upserted `client_profiles`, so admin-added (phone-only,
     synthetic-email) clients were absent from `/admin/clients`.
     Added the upsert + a one-shot backfill migration
     `20260525_backfill_client_profiles.sql`. Backfill applied to
     production: 1397 → 1424 profiles (+27 orphans healed, 0
     remaining; "Letty" recovered).
  2. **Pending email clarity.** First booking email read like a
     confirmation. Rewrote `sendBookingConfirmation` copy/subject to
     unmistakably say "Pending — awaiting confirmation"; the existing
     status-change email remains the genuine confirmation.
  3. **Rebook button.** New "Rebook" action in the appointment edit
     modal opens `NewAppointmentSheet` pre-filled with the client's
     name/email/phone (synthetic `@noemail` placeholders stripped).

**Deviation from plan:** out of original scope — owner requests during
the engagement. No SEO-plan deviation.

---

## WP-I — 2026-05-15 Semrush mega-export response
**Status:** complete, shipped to production
**PRs:** #50 (code), DB content edits applied directly

Aggregated the 279-row site-audit export. Top buckets were dominated
by one root cause + two thin-content patterns:

- **190 `/book?service=…&stylist=…` query variants** were being
  crawled as distinct pages (drove 190/261 "low text-to-HTML",
  190/202 "low word count", 39/44 "one internal link"). Fixed with
  `Disallow: /book?` in `public/robots.txt` (both default and
  AI-crawler groups). Prefix match — bare `/book` is unaffected.
- **5 `/services/<category>` pages** flagged low word count — the
  service list loads client-side so a no-JS crawler saw ~40 words.
  Added a server-rendered `longIntro` (~250 unique words/category) to
  `ServiceCategoryMeta`, rendered from the server component.
- **4 `/blog/category/<slug>` pages** — same shape; added slug-keyed
  server-rendered intro copy.
- **DB content edits** (applied directly, ISR picks up — no deploy):
  - `ombre-vs-balayage-color-technique`: `meta_title` was verbatim
    equal to the H1 ("Duplicate content in h1 and title") → set to a
    distinct brand-suffixed title.
  - `color-treated-hair-care-tips-vibrant-color`: removed a broken
    1999 journal DOI outbound link; kept the citation as plain text.

**Deferred (intentional):** the 34 `/services/item/*` + 6 `/team/*`
"low text-to-HTML" flags — those pages already received framing +
FAQs in earlier PRs and the 2026-05-15 crawl predates those deploys;
re-pull Semrush in ~48–72h before touching them.

---

## WP-J — /book indexability (the noindex saga)
**Status:** resolved, shipped to production
**PRs:** #51 → #52 → #53 → #54 (four iterations)

**Symptom:** bare `/book` served `X-Robots-Tag: noindex`.

**Root cause (confirmed pre-existing, NOT a regression):**
`/book/page.tsx` was `"use client"` end-to-end and called
`useSearchParams()` at the top level with no Suspense boundary —
since PR #35, ~15 PRs before any work in this engagement. That forces
a full-route CSR bailout; Next.js can only prerender a loading
skeleton and deliberately attaches `X-Robots-Tag: noindex` to it
(indexing an empty shell is harmful). Verified via git history.

**Iteration log:**
- **#51** — reverted a buggy middleware approach (PR #50 had set the
  noindex header from middleware; Vercel's CDN keys the `/book`
  prerender cache on path, not query string, so the header bled onto
  bare `/book`). Replaced with the cache-safe `robots.txt
  Disallow: /book?`. Correct, but only addressed the query-variant
  noise, not the underlying shell noindex.
- **#52** — busted the stale `/book` prerender artifact (Vercel
  reused the poisoned artifact across the #51 deploy since the route
  output was unchanged). Necessary cleanup; noindex persisted.
- **#53** — wrapped `useSearchParams()` in `<Suspense>` (the
  documented Next.js remedy). Necessary but **insufficient**: the
  whole route was still a client component, so there was no server
  content to prerender and Next kept the noindex.
- **#54** — the actual fix. Industry-standard App Router architecture:
  - `src/components/booking/BookingWizard.tsx` (new, `"use client"`)
    — the entire previous booking flow moved **verbatim** (same
    hooks, state machine, `useSearchParams`, `?step=` sync, Stripe
    dynamic import, JSX). Zero behavioural change.
  - `src/app/book/page.tsx` — now a **Server Component** rendering
    real indexable content (How-booking-works explainer,
    "What you can book" grid linking every `/services/<category>`,
    a 5-Q booking FAQ with visible Q/A, NAP) + `FAQPage` JSON-LD.
    The wizard mounts as a client island under `<Suspense>`.

**Merge hazard caught pre-ship:** because every PR in this engagement
came from the same long-lived branch and each was *squash*-merged to
`main`, `git merge origin/main` produced a **silent, conflict-marker-
free bad auto-merge** in `src/middleware.ts` that re-introduced the
#50 noindex block. Caught by auditing the merged file before pushing;
removed, restoring the correct #51 state. **Recommendation:** retire
`claude/improve-website-seo-LybGl` and start future work from fresh
branches off `main` to prevent recurrence.

**Production verification (`9e6a8de`, live):**
- `/book` → `200`, `x-robots-tag` **absent**, `x-vercel-cache:
  PRERENDER` — indexable.
- Server-rendered "How booking works", "What you can book" +
  `/services/*` links, "Booking FAQ" (visible Q/A) all present in
  the no-JS HTML.
- `ldjson-booking-faq` `FAQPage` JSON-LD present.
- Wizard island present (Suspense skeleton SSR'd, hydrates
  client-side); booking behaviour byte-identical.
- `middleware.ts` post-merge confirmed clean (no resurrected
  noindex).

**Open follow-up:** `/book` is now genuinely indexable for the first
time — submit it to GSC URL Inspector → Request Indexing so Google
re-crawls promptly.

---

## Owner punch list (post-deploy)

Migrations are **already applied** to production Supabase
(`hrrijetwksnfjtrcxihk`): `20260523_service_faqs`,
`20260524_neighborhoods`, `20260525_backfill_client_profiles`. All
WP code is merged to `main` and live. Remaining owner actions:

1. Validate schema:
   - https://search.google.com/test/rich-results on
     `https://www.thelookhairsalonla.com/services/item/balayage-incl-toner`
     → Service + FAQ rich-result eligibility.
   - Same against `/neighborhoods/pasadena-hair-salon` → Breadcrumb +
     FAQ.
   - Same against `/book` → FAQ.
2. Upload `docs/seo/disavow.txt` via Google Search Console →
   Disavow Links Tool against the canonical property.
3. Run the GSC reindex requests in `docs/seo/index-consolidation.md`,
   **and** add `/book` to that list (now indexable after WP-J).
4. Work through `docs/seo/citations.md` — start with the top-6 free
   listings, defer the rest.
5. Wait 14 days; re-run Semrush `organic_research` and compare to the
   baseline captured when this work was planned. Re-pull the site
   audit at +48–72h to confirm the WP-I/WP-J fixes cleared and to
   re-evaluate the deferred `/services/item/*` + `/team/*` flags.
6. Engineering hygiene: retire `claude/improve-website-seo-LybGl`;
   branch future work off `main` (see WP-J merge-hazard note).
