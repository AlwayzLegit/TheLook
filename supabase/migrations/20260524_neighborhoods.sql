-- WP-D: neighborhoods + neighborhood_faqs.
--
-- Geo-targeted landing pages for cities adjacent to Glendale where the
-- salon already has commuting clients but doesn't rank organically.
-- Each row becomes /neighborhoods/<slug>; the body_md column holds
-- unique 400-500 word markdown rendered server-side through the
-- existing blog markdown pipeline.
--
-- Hard rule: every row's body_md must be substantively different from
-- siblings (Google flags near-duplicate doorway pages aggressively).
-- If you cannot write distinct copy for a new neighborhood, do not
-- insert it.
--
-- Priority order is set by Semrush US volume + competition (May 2026):
--   pasadena       1000+320 = 1390 vol, KD 0.49
--   burbank         320+320+210 = 850 vol, KD 0.51
--   highland-park   590+40 = 630 vol, KD 0.27 (lowest competition)
--   studio-city     320+90 = 410 vol, KD 0.62
--
-- Eagle Rock (130), North Hollywood (170), Sherman Oaks (200),
-- Silver Lake (60), La Cañada (50), Atwater Village (20) are deferred
-- to the second neighborhood batch (WP-D phase 2).

CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  name                text NOT NULL,                 -- "Pasadena, CA"
  short_name          text NOT NULL,                 -- "Pasadena"
  primary_keyword     text NOT NULL,                 -- "hair salon pasadena"
  meta_title          text NOT NULL,
  meta_description    text NOT NULL,
  h1                  text NOT NULL,
  hero_subtitle       text,
  distance_miles      numeric(4,1),
  drive_time_minutes  integer,
  body_md             text NOT NULL,
  hero_image_url      text,
  landmarks           text[],                        -- referenced inside body_md
  related_service_slugs text[] NOT NULL DEFAULT '{}',
  active              boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_active_sort
  ON public.neighborhoods (active, sort_order)
  WHERE active = true;

DROP TRIGGER IF EXISTS trg_neighborhoods_updated_at ON public.neighborhoods;
CREATE TRIGGER trg_neighborhoods_updated_at
BEFORE UPDATE ON public.neighborhoods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- neighborhood_faqs — same pattern as service_faqs.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.neighborhood_faqs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_slug   text NOT NULL,
  question            text NOT NULL,
  answer              text NOT NULL,
  sort_order          integer NOT NULL DEFAULT 0,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_neighborhood_faqs_slug_sort
  ON public.neighborhood_faqs (neighborhood_slug, sort_order)
  WHERE active = true;

DROP TRIGGER IF EXISTS trg_neighborhood_faqs_updated_at ON public.neighborhood_faqs;
CREATE TRIGGER trg_neighborhood_faqs_updated_at
BEFORE UPDATE ON public.neighborhood_faqs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- RLS — anon read on active rows only, restrictive deny on writes.
-- ---------------------------------------------------------------
ALTER TABLE public.neighborhoods      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhood_faqs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read active neighborhoods" ON public.neighborhoods;
CREATE POLICY "Anon can read active neighborhoods"
  ON public.neighborhoods
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS deny_public ON public.neighborhoods;
CREATE POLICY deny_public ON public.neighborhoods
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_update ON public.neighborhoods;
CREATE POLICY deny_public_update ON public.neighborhoods
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_delete ON public.neighborhoods;
CREATE POLICY deny_public_delete ON public.neighborhoods
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Anon can read active neighborhood faqs" ON public.neighborhood_faqs;
CREATE POLICY "Anon can read active neighborhood faqs"
  ON public.neighborhood_faqs
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS deny_public ON public.neighborhood_faqs;
CREATE POLICY deny_public ON public.neighborhood_faqs
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_update ON public.neighborhood_faqs;
CREATE POLICY deny_public_update ON public.neighborhood_faqs
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_delete ON public.neighborhood_faqs;
CREATE POLICY deny_public_delete ON public.neighborhood_faqs
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- ---------------------------------------------------------------
-- Seed: 4 priority neighborhoods.
-- ON CONFLICT (slug) DO NOTHING preserves owner edits on re-run.
-- ---------------------------------------------------------------
INSERT INTO public.neighborhoods (
  slug, name, short_name, primary_keyword,
  meta_title, meta_description, h1, hero_subtitle,
  distance_miles, drive_time_minutes,
  landmarks, related_service_slugs, sort_order,
  body_md
) VALUES
(
  'pasadena-hair-salon',
  'Pasadena, CA',
  'Pasadena',
  'hair salon pasadena',
  'Hair Salon Near Pasadena, CA — 15 Min Down the 134 | The Look',
  'Color, balayage, cuts and styling for Pasadena clients at The Look Hair Salon in Glendale — 15 minutes west on the 134. Free parking, family-owned since 2011.',
  'Hair Salon Near Pasadena, CA',
  'Just 15 minutes west of Old Pasadena on the 134',
  6.0, 15,
  ARRAY['Old Pasadena', 'South Lake Avenue', 'Caltech', 'Huntington', 'Rose Bowl'],
  ARRAY['balayage-incl-toner', 'single-process-root-touch-up', 'full-highlights-incl-toner', 'keratin-straightening'],
  1,
  E'If you live or work in Pasadena and you''re searching for a hair salon that takes color seriously, The Look is a straight shot west on the 134 from Old Pasadena — about 15 minutes outside of rush hour. We''ve been doing color, cuts, and styling in this building since 2011, and a meaningful share of our regulars commute from Pasadena specifically because the chairs clustered around Lake and South Lake Avenue run noticeably more for the same service.\n\n## What Pasadena clients come to us for\n\n- **Balayage and dimensional color.** Pasadena clients often need their color to read polished on camera and under bright office lighting. Our color specialists work in foils, free-hand balayage, and air-touch techniques side by side, so we can dial in the brightness level you want without the demarcation you sometimes get from a single technique. Pair it with a B3 bond-builder add-on for any lightening service.\n- **Root touch-ups on tight cycles.** A lot of Pasadena professionals stop in every 4 weeks for a root refresh. Same-week scheduling is usually possible if you book before Tuesday for the same week.\n- **Smoothing treatments before humid summers.** Keratin and vitamin smoothing get heavy demand from May through September — Pasadena summers run a few degrees hotter than coastal LA, and the difference shows up in frizz.\n\n## Driving directions from Pasadena\n\nFrom most of central Pasadena, take the 134 West and exit at Central Avenue. The salon is one block south of the off-ramp on South Central Avenue. Free parking is in the private lot directly behind the building, plus metered street parking on Central. From the Caltech area, the route runs 15–18 minutes; from South Pasadena via Fair Oaks and the 134, closer to 12.\n\n## Why the drive is worth it\n\nFifteen minutes isn''t much, and the cost difference vs. the salons inside Pasadena''s commercial cluster typically pays for the gas a few times over. More importantly, the team here keeps a small, stable color roster — your stylist learns your formula and your hair''s history, so the second visit is faster than the first and the third faster than the second. That continuity is hard to find at higher-volume Pasadena studios where the chair rotates more often.\n\nIf you''re switching from a Pasadena salon, bring your current formula card (or just a photo of your last few appointments) and we''ll match or improve on what you''ve been getting. The free consultation is built into every color appointment — no separate booking needed.'
),
(
  'burbank-hair-salon',
  'Burbank, CA',
  'Burbank',
  'burbank hair salon',
  'Burbank Hair Salon — 10 Min From Magnolia Park | The Look',
  'Cuts, color, balayage and styling for Burbank clients at The Look Hair Salon — 10 minutes east on the 134 from Burbank Town Center. Walk-ins welcome.',
  'Burbank Hair Salon — 10 Minutes Away in Glendale',
  'Color, cuts and styling minutes from Magnolia Park & the Media District',
  3.0, 10,
  ARRAY['Burbank Town Center', 'Magnolia Park', 'Toluca Lake', 'Warner Bros', 'Disney Studios'],
  ARRAY['scissor-cut', 'classic-men-s-scissor-cut', 'balayage-incl-toner', 'blow-out', 'individual-extensions-i-tip-k-tip-tape-in'],
  2,
  E'Burbank and Glendale share a border, and the drive from most of Burbank to The Look is shorter than the drive between many Burbank neighborhoods. Coming from Magnolia Park or Burbank Town Center? You''re looking at 10 minutes east on the 134. From the Media District near Warner Bros. and Disney, closer to 12.\n\n## What Burbank clients book most\n\nBurbank''s media-and-entertainment economy means a lot of our Burbank clients need on-camera-ready styling — clean cuts that hold under HD, color that reads true under studio lights, and blowouts that survive a production day. We see this most in:\n\n- **Men''s scissor cuts and tapered fades.** Bookable as a 30-minute slot, walk-ins almost always accommodated. Beard line-ups and trims are available as the same appointment.\n- **Blowouts that hold for a multi-day shoot.** Day-of-event blowout, then a quick refresh the morning of day two — many of our Burbank regulars run this pattern weekly during their show''s production cycle.\n- **Tape-in and I-tip extensions for length and density** when a role calls for hair the client doesn''t currently have. We''ll match the extension hair to the natural color so there''s no visible blend line under studio lighting.\n- **Balayage and dimensional color** for the off-camera weekends, kept neutral enough to suit the next casting cycle.\n\n## Driving directions from Burbank\n\nFrom Magnolia Park, take the 134 East from Buena Vista or Pass Avenue and exit at Central Avenue. From the Media District, hop on the 134 from Alameda — the freeway is faster than surface streets even at 5pm. We''re a block south of the off-ramp with free parking behind the building. Total drive: 8–12 minutes depending on where in Burbank you start.\n\n## Walk-ins from Burbank\n\nIf your day frees up unexpectedly between meetings or shoots, walk in any day we''re open. We''ll seat you for a cut, beard trim, blowout, or threading appointment whenever a chair is free. For color, you''ll want to book — color appointments need formula prep before you arrive.\n\nIf you''re moving over from a Burbank salon, give us your formula card or your last few appointment notes and we''ll match what you had. The stylist roster is small and stable, so the relationship gets easier with each visit.'
),
(
  'highland-park-hair-salon',
  'Highland Park, CA',
  'Highland Park',
  'hair salon highland park',
  'Hair Salon Near Highland Park, CA — 15 Min on the 2 | The Look',
  'Color, cuts and styling for Highland Park clients at The Look — 15 minutes west on the 2. Family-owned since 2011, free parking.',
  'Hair Salon Near Highland Park, CA',
  'A short drive west on the 2 from York Boulevard & Figueroa',
  6.0, 15,
  ARRAY['York Boulevard', 'Figueroa', 'Highland Park Bowl', 'Sycamore Grove Park'],
  ARRAY['balayage-incl-toner', 'ombr-incl-toner', 'scissor-cut', 'color-gloss-toner', 'b3-intensive-repair-rebonding'],
  3,
  E'Highland Park''s York Boulevard and Figueroa scenes lean creative, and the haircut and color requests we see from Highland Park clients reflect that — softer balayage, lived-in ombré, fashion tones, and cuts that look intentional but not over-styled. The Look sits 15 minutes west on the 2, exit at Holly or Glendale Avenue and you''re here.\n\n## What Highland Park clients book most\n\n- **Lived-in balayage and ombré.** The dropped-root, hand-painted look our team specialises in suits the Highland Park aesthetic well — bright at the ends, deep at the roots, low maintenance between visits. Every balayage at the salon includes the toner step so it walks out finished.\n- **Color glosses and tonal corrections.** Many of our Highland Park clients come in between full appointments for a 45-minute gloss to refresh the tone — cheaper than a full lift, kinder to the hair, and the result lasts a couple of months.\n- **Bond-builder treatments for previously-lightened hair.** Highland Park clients tend to have a longer color history. A B3 Intensive Repair add-on is often the right first appointment before we touch the color at all.\n- **Scissor cuts that grow out well.** Highland Park clients value cuts that don''t need a five-week return. We''ll talk through how the shape grows back so you know how to time the next visit.\n\n## Driving directions from Highland Park\n\nFrom the York Boulevard corridor, take Avenue 64 to the 134 W, or hop on the 2 N at Avenue 35 / Eagle Rock Boulevard. Either route puts you at our front door in about 15 minutes. We''re on South Central Avenue, a block south of the 134''s Central exit. Free private lot parking behind the building.\n\n## Color history matters\n\nIf you''ve been getting color elsewhere — Highland Park, Eagle Rock, or further south in Echo Park or Silver Lake — bring whatever notes you have on the formula and which products were used. Our color specialists will rebuild from there rather than start from scratch, which is how we keep the result consistent visit-to-visit. Free consultation slot is built into every color appointment.'
),
(
  'studio-city-hair-salon',
  'Studio City, CA',
  'Studio City',
  'hair salon studio city',
  'Hair Salon Near Studio City, CA — 15 Min on the 134 | The Look',
  'Cuts, color, smoothing and styling for Studio City clients at The Look — 15 minutes east on the 134 from Ventura Boulevard. Free parking.',
  'Hair Salon Near Studio City, CA',
  'Color, cuts and smoothing minutes from Ventura Boulevard',
  8.0, 15,
  ARRAY['Ventura Boulevard', 'CBS Studio Center', 'Tujunga Village', 'Universal Studios'],
  ARRAY['balayage-incl-toner', 'partial-highlights-incl-toner', 'keratin-straightening', 'vitamin-smoothing-99-natural', 'blow-out'],
  4,
  E'Studio City sits on the other side of the 134 from us, and the drive over runs about 15 minutes from most of Ventura Boulevard — slightly longer at the 5pm crunch. Many of our Studio City clients come to us specifically because the salons clustered between Laurel Canyon and Coldwater Canyon run on a higher rate than they need to, especially for the maintenance work between bigger appointments.\n\n## What Studio City clients book most\n\n- **Partial highlights with a face-frame.** A lot of our Studio City regulars run the same color program: partial highlights every 10–12 weeks, gloss in between. The pattern is gentler on the hair than full highlights every 8 weeks and the brightness around the face is what reads on camera or in a meeting.\n- **Keratin and vitamin smoothing.** The Valley humidity that creeps in from late spring through fall is the main reason Studio City clients book smoothing treatments here — and keratin holds noticeably better when the salon doesn''t rush the application time.\n- **Mid-week blowouts.** Standing weekly or bi-weekly blowouts are a frequent ask from Studio City clients who want to skip the daily styling time. We''ll book a recurring slot if you want consistency in stylist and time.\n- **Balayage on previously-foiled hair.** A common ask: shift from years of foil highlights into a softer, lower-maintenance balayage. The transition usually takes one full appointment plus a follow-up gloss six weeks later.\n\n## Driving directions from Studio City\n\nFrom Ventura Boulevard, hop on the 134 East at Coldwater Canyon, Whitsett, or Laurel Canyon. The 134 is the fastest route east into Glendale even mid-afternoon. Exit at Central Avenue and we''re one block south on South Central. Free parking in our private lot.\n\n## Switching salons\n\nIf you''ve been with a Studio City salon and you''re considering a change, bring your current color formula or a photo of your last several appointments. We''ll match what you had on the first visit so the transition isn''t visible, then refine from there as we get to know your hair. The team here is small and stable, so the same stylist will see you every visit unless you specifically want to try someone else.'
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------
-- Seed neighborhood FAQs (4 per neighborhood).
-- ---------------------------------------------------------------
DO $$
DECLARE
  nslug text;
BEGIN
  nslug := 'pasadena-hair-salon';
  IF NOT EXISTS (SELECT 1 FROM public.neighborhood_faqs WHERE neighborhood_slug = nslug) THEN
    INSERT INTO public.neighborhood_faqs (neighborhood_slug, question, answer, sort_order) VALUES
      (nslug, 'How long does it take to drive from Pasadena to The Look?',
        'About 12–15 minutes outside of rush hour. The 134 West drops you a block from the salon — exit at Central Avenue. Add 5–10 minutes for the 5pm window if you''re coming from East Pasadena.', 1),
      (nslug, 'Is parking available?',
        'Yes — free private parking lot directly behind the building, plus metered street parking on South Central Avenue. The lot is usually wide open during weekday color appointments.', 2),
      (nslug, 'Do you take Pasadena-area gift cards or formulas from other salons?',
        'We don''t take other salons'' gift cards, but we''re happy to work from your existing color formula card — bring it (or a photo of your last appointment notes) and your stylist will match the result so the transition isn''t visible.', 3),
      (nslug, 'How do you compare on price to Pasadena salons?',
        'Most of our regular services run 20–30 percent under the salons clustered around South Lake and Lake Avenue, with comparable or better color expertise. Specific pricing varies by service — every category page shows the starting rate.', 4);
  END IF;

  nslug := 'burbank-hair-salon';
  IF NOT EXISTS (SELECT 1 FROM public.neighborhood_faqs WHERE neighborhood_slug = nslug) THEN
    INSERT INTO public.neighborhood_faqs (neighborhood_slug, question, answer, sort_order) VALUES
      (nslug, 'How far is The Look from Burbank?',
        'Most of Burbank is 8–12 minutes away. From Magnolia Park, take the 134 East to Central Avenue. From the Media District near Warner Bros. or Disney, hop on the 134 from Alameda — the freeway beats surface streets even at 5pm.', 1),
      (nslug, 'Do you take walk-ins from Burbank?',
        'Yes — walk-ins are welcome whenever a chair is open. We seat haircuts, blowouts, beard trims, and threading without an appointment. For color and longer services, booking ahead is recommended so we can prep the formula before you arrive.', 2),
      (nslug, 'Can you handle on-camera-ready styling for a production day?',
        'Yes — a lot of our Burbank clients work in production. Bring a reference photo and your call time and we''ll plan the appointment so your hair is camera-ready when you walk in to set, including extensions or color touch-ups if needed.', 3),
      (nslug, 'Are weekend slots available?',
        'Saturdays are our busiest day, especially for color. Book 7–10 days out for a weekend color slot. Cuts and blowouts on Saturdays usually have same-week availability.', 4);
  END IF;

  nslug := 'highland-park-hair-salon';
  IF NOT EXISTS (SELECT 1 FROM public.neighborhood_faqs WHERE neighborhood_slug = nslug) THEN
    INSERT INTO public.neighborhood_faqs (neighborhood_slug, question, answer, sort_order) VALUES
      (nslug, 'How long is the drive from Highland Park?',
        'About 15 minutes via the 134 West or the 2 North, depending on where you''re starting. From the York Boulevard corridor, Avenue 64 to the 134 is the cleanest route.', 1),
      (nslug, 'I have a long color history elsewhere — is that a problem?',
        'Not at all — bring whatever notes or photos you have of recent appointments. Our color specialists will assess the current state of the hair and either match the existing formula or rebuild from there. The first appointment usually includes a free consultation slot.', 2),
      (nslug, 'Do you offer color glosses as a standalone service?',
        'Yes. A 45-minute color gloss between full color appointments refreshes the tone, knocks out brassiness, and is gentler on the hair than re-lifting. It''s a frequent ask from clients with longer color histories.', 3),
      (nslug, 'Do you do fashion tones — coppers, blondes, or ash tones?',
        'Yes, our color specialists work across the spectrum, including high-lift blondes, copper, and cooler ash tones. We''ll talk through whether your current base will hold the target without a multi-session lift.', 4);
  END IF;

  nslug := 'studio-city-hair-salon';
  IF NOT EXISTS (SELECT 1 FROM public.neighborhood_faqs WHERE neighborhood_slug = nslug) THEN
    INSERT INTO public.neighborhood_faqs (neighborhood_slug, question, answer, sort_order) VALUES
      (nslug, 'How long does it take to drive from Studio City?',
        'About 15 minutes from most of Ventura Boulevard via the 134 East. Slightly longer in the 5pm window. The 134 is the fastest route east into Glendale even mid-afternoon — surface streets take twice as long.', 1),
      (nslug, 'Can I move from foil highlights to balayage?',
        'Yes — it''s one of our more common Studio City requests. The transition usually takes one full appointment plus a gloss follow-up about six weeks later. We''ll talk through the timeline at a free consultation before booking.', 2),
      (nslug, 'How long does a keratin smoothing treatment last?',
        'Full keratin straightening holds for 3–5 months depending on how often you wash and which shampoos you use. Sulfate-free shampoo extends the result noticeably. Vitamin smoothing is a gentler alternative that holds 8–12 weeks.', 3),
      (nslug, 'Can I book a standing weekly blowout?',
        'Yes — we''ll reserve the same time slot each week and pair you with the same stylist for consistency. Email or call the salon to set up the recurring booking; it''s easier than re-booking each week individually.', 4);
  END IF;
END $$;
