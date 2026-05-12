# WP-F (part 2) — Local citations + NAP consistency

Owner action plan. Code-side artifacts (disavow file) are in
`docs/seo/disavow.txt`; the work below requires the owner's email,
phone, and on-some-sites a credit card.

## 1. Canonical NAP

This is the single source-of-truth that every directory listing should
match **exactly** — same capitalisation, same suite number format, same
phone formatting. Inconsistent NAP is the most common reason a local
business loses Map-pack rankings, and Google's local algorithm is
strict about even small variations (Ave vs Avenue, # vs No., etc.).

Pull the live values from `/admin/branding` before submitting anywhere
— the seeded values below are likely accurate but the admin UI is the
authoritative source. If the salon ever changes its phone or moves
suite numbers, every directory below needs an update too.

```
Name:    The Look Hair Salon
Address: 919 South Central Avenue, Suite #E
         Glendale, CA 91204
Phone:   (818) 662-5665
Website: https://www.thelookhairsalonla.com
Email:   <pull from /admin/branding>
Hours:   Monday 10:00-18:00
         Tuesday CLOSED
         Wednesday-Saturday 10:00-18:00
         Sunday 10:00-17:00
Category: Hair Salon (primary) + Beauty Salon (secondary)
```

Verify these match the homepage JSON-LD output before submitting
anywhere — open `view-source:https://www.thelookhairsalonla.com/` and
search for `"addressLocality"`. Any mismatch means /admin/branding got
edited and these docs are stale.

## 2. Top-priority citations (do these first)

These are the listings that move the local-pack needle the fastest.
Most are free; budget about 90 minutes total to claim all 6.

| Directory | URL | Status check |
|---|---|---|
| **Google Business Profile** | https://business.google.com | Claim/verify the listing tied to the salon's Google Place ID. Confirm the website link points at `https://www.thelookhairsalonla.com` (no trailing slash variant). Upload at least 10 photos. Set the primary category to "Hair Salon" and secondary to "Beauty Salon". |
| **Yelp for Business** | https://biz.yelp.com | Already claimed (we sync reviews from it). Confirm the website URL matches the canonical and the hours match `/admin/schedule`. |
| **Bing Places** | https://www.bingplaces.com | Free. Import from Google Business Profile if possible — saves 20 minutes of re-entry. |
| **Apple Business Connect** | https://businessconnect.apple.com | Free. Powers Maps + Spotlight on iOS. Apple is now where 25-30% of local searches happen for iPhone users. |
| **Yellow Pages** | https://www.yellowpages.com | Free basic listing. Skip the paid upsell — the free tier is sufficient for citation purposes. |
| **Foursquare for Business** | https://business.foursquare.com | Free. Powers the location data behind several map / nav apps. |

## 3. Secondary citations (do these in week 2)

Lower-impact individually but they collectively reinforce the canonical
NAP and improve overall citation density — which Google does notice.

- **DexKnows** — https://www.dexknows.com
- **Manta** — https://www.manta.com
- **Citysearch** — https://citysearch.com
- **Hotfrog** — https://www.hotfrog.com
- **MerchantCircle** — https://www.merchantcircle.com
- **The Hub LA / LA Business Directory** — https://www.localfollowup.com (curated LA listings)
- **YP.com** (Yellow Pages successor, distinct listing from #2 above)
- **MapQuest** — submit via Foursquare; MapQuest pulls from Foursquare data

## 4. Industry + Glendale-local opportunities

Industry-specific:

- **StyleSeat** / **Vagaro** / **Booksy** — if the salon ever lists on a booking platform, that directory listing is a strong citation. Check the existing booking platform's directory.
- **Aveda salon locator** — only if the salon stocks Aveda products.
- **Redken salon locator** — confirmed in use per the FAQ copy ("we use Redken"). Submit at https://www.redken.com/locate-a-salon (free).

Glendale-specific (these are the high-leverage local link targets the
plan called out in section 2.4 — most overlap with the citation list
but are worth pursuing as outreach, not just submissions):

| Target | Why it matters | Approach |
|---|---|---|
| **Glendale Chamber of Commerce** — https://www.glendalechamber.com | Chamber directory listing carries strong local authority signals. | Free membership tier should include a directory listing; consider a paid tier for the linked profile if budget allows. |
| **DowntownGlendale.com** | Glendale district business directory. | Apply for inclusion via their contact form. Mention being on South Central Ave (a Downtown Glendale street). |
| **Glendale News-Press** | Local newspaper. | Pitch a feature on the salon's 15-year anniversary in 2026. A single mention in their online edition is one of the strongest local citations available. |
| **Harsanik.com** | Armenian wedding & lifestyle directory. ~40% of Glendale's population is Armenian. | Request inclusion as a special-occasion stylist. Pitch is bridal/event styling expertise, even though we're not building dedicated bridal pages yet. |

## 5. Citation hygiene checklist (run quarterly)

- [ ] Run a free audit at https://moz.com/local/search or https://www.brightlocal.com/free-business-listing-scan/ — both surface inconsistent NAP across major directories.
- [ ] Search Google for `"The Look Hair Salon" "919 South Central"` and confirm the top 10 results match the canonical NAP.
- [ ] If the phone number ever changes, **update Google Business Profile first**, then Yelp, then everything else within 48 hours. Google's ranking algorithm prioritises GBP changes.
- [ ] Update photos in GBP at least once a quarter. Stale photos correlate with lower Map-pack ranking.

## 6. What NOT to do

- **Do not** submit to "submit your site to 5000 directories" services — those are exactly the spam clusters our disavow file is cleaning up.
- **Do not** use a different business name on different directories ("The Look", "Look Hair Salon LA", "TheLook Salon"). Pick one canonical and use it everywhere.
- **Do not** chase paid citation services that promise rapid Map-pack improvements. Real improvement comes from claiming the 6 free top-tier listings above and keeping them in sync.
