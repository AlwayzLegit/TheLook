# WP-A — Index consolidation & reindex requests

Owner: salon owner / SEO operator (action in Google Search Console).
Author: SEO audit pass, May 2026.

## Why this file exists

Semrush still reports the following URLs as ranking under our domain even though
each one is a 308 redirect in production:

| Stale URL (in Google's index) | Keywords it still ranks for | Live behavior |
|---|---|---|
| `http://www.thelookhairsalonla.com/` | 15 KWs, 712 mo. traffic — top variants of "hair salon glendale" | 308 → `https://www.thelookhairsalonla.com/` (Vercel HTTPS upgrade) |
| `http://thelookhairsalonla.com/` | (subset of the above) | 308 → `https://www.thelookhairsalonla.com/` |
| `https://thelookhairsalonla.com/` (apex) | shares brand cluster | 308 → `https://www.thelookhairsalonla.com/` (next.config.ts apex→www rule) |
| `https://www.thelookhairsalonla.com/services-1` | "look hair salon" #79, 12 KWs total | 308 → `https://www.thelookhairsalonla.com/services` |
| `https://www.thelookhairsalonla.com/about-1` | (no traffic, dead URL) | 308 → `https://www.thelookhairsalonla.com/about` |
| `https://www.thelookhairsalonla.com/services/item/balayage` | (none currently) | 308 → `.../balayage-incl-toner` |
| `/team/alisa-h`, `/team/armen-p`, `/team/kristina-g` | stylist-name terms | each 308 → current canonical slug |

The redirects are in place (see `next.config.ts` `redirects()`). Google just
hasn't recrawled and consolidated yet. The fix is a manual GSC reindex push,
not new code.

## Verification (already confirmed on production, May 2026)

```
HTTP apex   GET http://thelookhairsalonla.com/        → 308 → https://www.thelookhairsalonla.com/
HTTP www    GET http://www.thelookhairsalonla.com/    → 308 → https://www.thelookhairsalonla.com/
HTTPS apex  GET https://thelookhairsalonla.com/       → 308 → https://www.thelookhairsalonla.com/
HTTPS www   GET https://www.thelookhairsalonla.com/   → 200 (canonical)
            response includes Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

```
/services-1                       → 308 → /services
/about-1                          → 308 → /about
/term-conditions                  → 308 → /terms
/services/item/balayage           → 308 → /services/item/balayage-incl-toner
/team/alisa-h                     → 308 → /team/alisa-liz
/team/armen-p                     → 308 → /team/armen
/team/kristina-g                  → 308 → /team/kristina
```

The `/privacy-policy` and `/terms-and-conditions` paths are intentionally
*rewrites* (not redirects) because Twilio's A2P 10DLC carrier registration
expects those exact URLs to return 200. Both URLs are excluded from the
sitemap so Google indexes only the canonical `/privacy` and `/terms`.

## Action plan (owner runs in Google Search Console)

### Step 1 — Confirm the right GSC property

The canonical property must be the **Domain property** `thelookhairsalonla.com`
(DNS-verified), which automatically covers every host + scheme variant. If
only a URL-prefix property exists (`https://www.thelookhairsalonla.com/`), add
the Domain property and verify via DNS TXT record. Keep the URL-prefix
property too — it's the one with reporting history.

Delete (Remove Property) any old URL-prefix properties for:
- `http://www.thelookhairsalonla.com/`
- `http://thelookhairsalonla.com/`
- `https://thelookhairsalonla.com/` (the apex variant)

These properties report inflated/duplicate metrics that confuse the dashboard.
The Domain property still tracks every variant.

### Step 2 — Submit the sitemap (if not already submitted in the canonical property)

In the canonical property → **Sitemaps** → submit `sitemap.xml`. Confirm
status reads "Success" within 48 hours. The sitemap currently lists 73 URLs
(home, 5 service categories, 35 service-item pages, 6 stylist pages, 4 blog
categories, 8 blog posts, /team, /gallery, /about, /contact, /book,
/privacy, /terms).

### Step 3 — Force a recrawl of each canonical URL (URL Inspector)

For each row in the table below, run **URL Inspector → Test Live URL →
Request Indexing** against the **canonical** column. This is what
collapses the stale duplicates from Semrush.

| Canonical URL to inspect | Why |
|---|---|
| `https://www.thelookhairsalonla.com/` | Force Google to re-evaluate the http variant's 712-visit ranking and credit those signals to https://www. |
| `https://www.thelookhairsalonla.com/services` | Pull "look hair salon" + 11 other KWs off the /services-1 URL onto the canonical /services. |
| `https://www.thelookhairsalonla.com/about` | Clear /about-1 from the index. |
| `https://www.thelookhairsalonla.com/services/item/balayage-incl-toner` | Replace the legacy /balayage URL. |
| `https://www.thelookhairsalonla.com/team/alisa-liz` | Replace `/team/alisa-h`. |
| `https://www.thelookhairsalonla.com/team/armen` | Replace `/team/armen-p`. |
| `https://www.thelookhairsalonla.com/team/kristina` | Replace `/team/kristina-g`. |

GSC caps Request Indexing at ~10 URLs / day per property. The list above
fits in one day. If a request returns "URL is on Google", that's already
the canonical and no action is needed.

### Step 4 — Watch the "look hair care studio" cannibalization

Three URLs are currently ranking at positions 16 / 18 / 31 for
"look hair care studio" — all pointing at the homepage in Semrush, but at
different historical hosts. Re-running URL Inspector on `https://www.thelookhairsalonla.com/`
in step 3 should consolidate this within a Google recrawl cycle (2–4 weeks).

Re-check rankings in Semrush at +14 days and +28 days. Expect the duplicate
entries to collapse to a single top-10 ranking on the canonical URL.

## Timing expectation

| Day | Expected state |
|---|---|
| 0 | Steps 1–3 done, sitemap "Success" in GSC |
| +3 to +7 | Google crawls each requested URL, the canonical's "Last crawl" timestamp updates |
| +14 | Semrush shows the http://www. row dropping; canonical https://www. row gains keywords |
| +28 | "look hair care studio" cannibalization collapses; "look hair salon" #79 disappears |
| +60 | Aggregate organic traffic should be at or above the pre-consolidation baseline (the 712 + 486 split converges to a single number on the canonical URL) |

## Out of scope

- New redirects — not needed; all required redirects already exist in `next.config.ts`.
- Sitemap changes — `app/sitemap.ts` already emits the canonical URLs.
- Backlink work — covered in WP-F.
