-- WP-C: service_faqs — per-service FAQ entries rendered on
-- /services/item/<slug> and serialized into FAQPage JSON-LD.
--
-- Why per-service (not page-level component literals):
--   The site-wide FAQ component on /services already covers booking
--   logistics (deposits, walk-ins, products). Per-service FAQs cover
--   the *service-specific* questions Google's "People also ask" panel
--   surfaces — different surface, no duplication, separately editable
--   by the owner without a code deploy.
--
-- Why service_slug (not service_id FK):
--   The slug is unique in services.slug, matches the public URL, and
--   survives an admin-side row rebuild (e.g. if a service is re-created
--   with the same slug, FAQs stay valid). Seed-insert ergonomics are
--   also better — no need to look up uuids inside the migration.
--
-- Rendering rule (enforced by code, not schema): every Q/A here is
-- rendered verbatim in visible page content before the FAQPage JSON-LD
-- is emitted. Hidden FAQ schema risks a Google manual action.

CREATE TABLE IF NOT EXISTS public.service_faqs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug  text NOT NULL,
  question      text NOT NULL,
  answer        text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexed read pattern: fetch active FAQs for one slug in order.
CREATE INDEX IF NOT EXISTS idx_service_faqs_slug_sort
  ON public.service_faqs (service_slug, sort_order)
  WHERE active = true;

-- updated_at maintenance via the existing trigger fn from the blog
-- migration (set_updated_at()).
DROP TRIGGER IF EXISTS trg_service_faqs_updated_at ON public.service_faqs;
CREATE TRIGGER trg_service_faqs_updated_at
BEFORE UPDATE ON public.service_faqs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Same RLS shape as blog_categories: anon SELECT on active rows,
-- restrictive deny on everything else. Admin writes go through the
-- service-role key.
ALTER TABLE public.service_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read active service faqs" ON public.service_faqs;
CREATE POLICY "Anon can read active service faqs"
  ON public.service_faqs
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS deny_public ON public.service_faqs;
CREATE POLICY deny_public ON public.service_faqs
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_update ON public.service_faqs;
CREATE POLICY deny_public_update ON public.service_faqs
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_public_delete ON public.service_faqs;
CREATE POLICY deny_public_delete ON public.service_faqs
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);

-- ---------------------------------------------------------------
-- Seed: high-volume service clusters per Semrush US, May 2026
-- ---------------------------------------------------------------
-- Each cluster targets a verified keyword opportunity from the WP-C
-- analysis: haircuts (170+110 vol), balayage, color (single-process,
-- root touch-up), highlights (full + partial), extensions, keratin,
-- styling (blow-out, formal updo), men's haircuts (50 vol), and
-- threading (90 vol — "eyebrow threading glendale" is the largest
-- low-competition opening we have).
--
-- Tone: short, factual, conversational. Each answer is something a
-- real client would expect to hear before booking. We deliberately
-- avoid keyword stuffing — "Glendale" appears at most once per answer
-- and only where it sounds natural.
--
-- ON CONFLICT keys: there is no natural-key constraint on
-- (service_slug, question) so a re-run will duplicate. The migration
-- is idempotent via a guard clause: only insert when no FAQ exists
-- yet for that slug. This lets the owner edit copy in /admin without
-- the migration overwriting it.

DO $$
DECLARE
  slug_var text;
BEGIN
  -- Haircuts — target: "haircut glendale" (170/mo), "haircut in glendale ca" (110/mo)
  slug_var := 'scissor-cut';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'Do you take walk-ins for haircuts?',
        'Yes — walk-ins are welcome whenever a chair is open. On busy days (especially Saturdays) we recommend booking a slot so you do not wait. You can book online or call us directly.', 1),
      (slug_var, 'How long does a scissor cut take?',
        'About 45 minutes for most shapes — long-hair specialty cuts and major restyle consultations can run an hour. Every cut includes a wash and a basic finish so you see the silhouette before you leave.', 2),
      (slug_var, 'I am not sure what cut to ask for. Can you help?',
        'Bring a photo if you have one in mind, or just describe how you wear your hair day to day. We will talk through face shape, growth pattern, maintenance time, and texture before the first snip — no commitment until you are happy with the plan.', 3),
      (slug_var, 'How often should I get a haircut?',
        'Plan on 4–6 weeks for short and structured styles, 6–10 weeks for layered medium length, and 8–12 weeks for long hair you are growing out. Bangs alone hold their shape for about 3–4 weeks.', 4);
  END IF;

  slug_var := 'wash-cut-style';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'What is included in a wash, cut, and style?',
        'A scalp-massage shampoo, conditioner, the haircut itself, and a full finish — blow-dry and either a smooth or wavy style depending on what you want. Plan on roughly an hour.', 1),
      (slug_var, 'Do I need to come with clean hair?',
        'Not at all — the appointment opens with a wash. If you have heavy product build-up, mention it at check-in so your stylist can pick the right clarifying shampoo.', 2),
      (slug_var, 'Can I add a treatment to my appointment?',
        'Yes. A Custom Hair Treatment Cocktail or Deep Conditioning add-on fits inside the same chair time and is the easiest way to address dryness or breakage during a haircut visit.', 3),
      (slug_var, 'How is this different from a scissor cut?',
        'A scissor cut covers the shaping work itself. Wash, cut, and style bundles the shampoo + finish into one package — best when you want to walk out of the salon ready for the day rather than re-styling at home.', 4);
  END IF;

  slug_var := 'classic-men-s-scissor-cut';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'Do you offer men''s haircuts?',
        'Yes — classic scissor cuts, clipper cuts and fades, beard line-ups, and beard trims. Plenty of regulars who come in for color or styling bring their partners and sons too.', 1),
      (slug_var, 'How long does a men''s haircut take?',
        'About 30 minutes for a clean scissor cut or a fade plus line-up. Add 10–15 minutes if you want a wash and a basic style worked in.', 2),
      (slug_var, 'Do you do fades and tapers?',
        'Yes — low, mid, and high fades, plus tapered cuts using either clippers or shears depending on the shape you want. Stop in or book online; for a specific stylist, mention them when you reserve the slot.', 3),
      (slug_var, 'Can you cut kids'' hair too?',
        'We cut hair for kids age 3 and up. We have booster cushions and patient stylists; bring a video for restless little ones.', 4);
  END IF;

  -- Color — target: "hair color glendale", "color correction glendale"
  slug_var := 'single-process-full-color';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'How long does a single-process color appointment take?',
        'Most full-coverage color sessions run 90 minutes to 2 hours depending on length and density. Add development time if you are going dramatically darker or covering resistant grays.', 1),
      (slug_var, 'Will single-process color cover my gray hair?',
        'Yes — our permanent color line gives full gray coverage on the first application. We use Igora Luxury Hair Color and Redken formulas that stay vibrant and condition the hair during processing.', 2),
      (slug_var, 'How do I prepare for my color appointment?',
        'Come with hair that has not been washed for 1–2 days — your natural scalp oils protect against any irritation. Skip heavy styling products on the day of the appointment.', 3),
      (slug_var, 'How long will the color last?',
        'Permanent color holds until your roots grow in — most clients return every 4–6 weeks for a root touch-up. A toner or gloss refresh between full appointments keeps the color from going brassy.', 4);
  END IF;

  slug_var := 'single-process-root-touch-up';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'How often should I touch up my roots?',
        'Every 4–6 weeks for most clients. People with faster gray cycles or higher contrast between natural and target color sometimes prefer 3–4 weeks. Pulling the timing tight keeps the line invisible.', 1),
      (slug_var, 'How long does a root touch-up take?',
        'About 60–90 minutes from chair-up to walk-out, including the wash and a basic finish. Plan on closer to two hours if you are adding a gloss or a toner refresh.', 2),
      (slug_var, 'Can I get a root touch-up between full color appointments?',
        'Yes — that is exactly what this service is for. The mid-length and ends are left untouched so the older color does not over-saturate, and only the new growth is refreshed.', 3),
      (slug_var, 'What is the difference between a root touch-up and a full color?',
        'A root touch-up refreshes only the new growth (typically the first inch or two). A full single-process color reapplies pigment from root to ends, which is what we recommend if the existing color has faded significantly.', 4);
  END IF;

  -- Balayage — target: "balayage glendale"
  slug_var := 'balayage-incl-toner';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'How long does balayage last?',
        'Because the lightener is hand-painted free of the root, balayage grows out softly and most clients re-visit every 10–14 weeks. A gloss refresh at the 5–7 week mark keeps the tone from going brassy.', 1),
      (slug_var, 'Will balayage damage my hair?',
        'Done correctly, balayage is gentler on the hair than full highlights because foils are not used and the lightener never sits directly at the root. We pair every lightening service with a B3 Intensive Repair add-on to protect the bond structure during processing.', 2),
      (slug_var, 'What is the difference between balayage and highlights?',
        'Highlights are pulled through foils in tight, uniform sections — great for an evenly-bright result. Balayage is hand-painted in sweeping, irregular strokes that mimic how the sun naturally lightens hair, so the grow-out is much softer.', 3),
      (slug_var, 'How much does balayage cost in Glendale?',
        'Balayage at The Look starts at the price shown on this page and scales with length, density, and how dramatic a lift you want. A free consultation is included if you are not sure where you fall on that range — we will look at your hair and give you a firm quote.', 4),
      (slug_var, 'Do you recommend a toner with balayage?',
        'Yes — every balayage at our salon includes the toning step. Lightener alone leaves warm undertones; the toner refines the color into the exact shade you want and helps the result feel finished from day one.', 5);
  END IF;

  -- Highlights — target: "highlights glendale", "partial highlights glendale"
  slug_var := 'full-highlights-incl-toner';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'What is the difference between full and partial highlights?',
        'Full highlights cover the entire head from front, sides, and back. Partial highlights focus on the top half and around the face — best when you want brightness around the framing pieces without the maintenance of a full head.', 1),
      (slug_var, 'How long do full highlights take?',
        'About 2.5 to 3 hours including the toner and finish. Very long or dense hair can run closer to 3.5 hours.', 2),
      (slug_var, 'How often should I refresh my highlights?',
        'Most clients return every 8–12 weeks. A gloss in between keeps the tone fresh without re-lifting, which is gentler on the hair.', 3),
      (slug_var, 'Will highlights damage my hair?',
        'Lightening is always more demanding than depositing color, but we minimize damage by using a B3 bond-builder in every lightener mix and finishing with a deep conditioning treatment. Avoid hot tools and clarifying shampoos for the first 48 hours.', 4);
  END IF;

  slug_var := 'partial-highlights-incl-toner';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'Are partial highlights right for me?',
        'Partial highlights are a good fit when you want brightness around the face and on top — the back stays your natural color. They are also a lower-commitment way to test a highlight color before going full.', 1),
      (slug_var, 'How long do partial highlights take?',
        'About 90 minutes to 2 hours including toner and a basic finish.', 2),
      (slug_var, 'Can I add partial highlights to my root touch-up?',
        'Yes — many regular color clients alternate full color with a root touch-up plus partial highlights to keep dimension without committing to full lift every time.', 3),
      (slug_var, 'How often should I get partial highlights done?',
        'Plan on every 10–14 weeks. Because the back is untouched, the grow-out is more forgiving than with full highlights.', 4);
  END IF;

  -- Extensions — target: "hair extensions glendale"
  slug_var := 'individual-extensions-i-tip-k-tip-tape-in';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'How long do hair extensions last?',
        'Tape-in extensions typically stay in for 6–8 weeks before they need to be moved up. I-tip and K-tip strands can hold for 8–12 weeks with proper care. The hair itself can be reused for 6–9 months if you treat it gently.', 1),
      (slug_var, 'Do hair extensions damage your hair?',
        'When installed and removed correctly, extensions do not damage your natural hair. We choose the bond type that matches your hair density and lifestyle — over-installing or pulling the bonds tight is what causes most extension-related breakage.', 2),
      (slug_var, 'Which type of extensions is best for me — I-tip, K-tip, or tape-in?',
        'Tape-ins lay flatter and are best for fine hair. I-tips use micro-beads with no glue and are great for active lifestyles. K-tips (keratin bonds) hold the longest but take more chair time to install. We will walk through all three at the consultation.', 3),
      (slug_var, 'How much do hair extensions cost?',
        'Installation cost varies by method and number of strands; the extension hair itself is purchased separately and priced by length and density. A free consultation locks in a firm quote before you commit.', 4);
  END IF;

  -- Keratin — target: "keratin treatment glendale", "smoothing treatment glendale"
  slug_var := 'keratin-straightening';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'How long does a keratin treatment last?',
        'A full keratin straightening treatment holds for 3–5 months depending on how often you wash and which shampoos you use. Sulfate-free shampoo extends the result noticeably.', 1),
      (slug_var, 'Can I wash my hair after a keratin treatment?',
        'Wait 48–72 hours before the first wash so the treatment has time to bond fully. Avoid tying your hair up or putting any kinks in it during that window — the shape sets in those first three days.', 2),
      (slug_var, 'What is the difference between keratin and Brazilian blowout?',
        'Both smooth frizz, but keratin treatments restructure the hair and last longer (3–5 months); Brazilian-style blowouts coat the cuticle and last about 8–12 weeks. We can walk through which one fits your hair type at the consultation.', 3),
      (slug_var, 'Is keratin straightening safe for color-treated hair?',
        'Yes — and many clients prefer to get color and keratin in the same week (color first, then keratin a few days later) so the new tone gets sealed in by the treatment.', 4);
  END IF;

  -- Styling — target: "blowout glendale", "blow dry glendale"
  slug_var := 'blow-out';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'How long does a blowout last?',
        'A professional blowout lasts 3–5 days for most hair types. Dry shampoo on the second day, sleeping on a silk pillowcase, and a silk wrap or loose bun overnight will extend the look further.', 1),
      (slug_var, 'Should I come with clean or dirty hair for a blowout?',
        'The appointment includes a wash, so come however your hair is. If you specifically want to skip the wash (e.g., you washed that morning), let us know at check-in and we will go straight to styling.', 2),
      (slug_var, 'How long does a blowout take?',
        'About 45 minutes start to finish for most lengths — closer to an hour for very thick or very long hair.', 3),
      (slug_var, 'Can I get a blowout the day before an event?',
        'Yes — that is exactly when many clients book one. A blowout the day before holds beautifully for a next-day event with light touch-ups in the morning.', 4);
  END IF;

  slug_var := 'formal-updo';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'How long does a formal updo take?',
        'Plan on 60–90 minutes depending on intricacy. Bring inspiration photos and any hair accessories you want incorporated.', 1),
      (slug_var, 'How far in advance should I book an updo for an event?',
        'For weddings and big events, we recommend booking 4–8 weeks in advance — especially for Friday afternoon and Saturday slots. Smaller events can usually be accommodated with a week''s notice.', 2),
      (slug_var, 'Should I come with clean or dirty hair for an updo?',
        'Day-old hair holds an updo better than freshly-washed hair. Skip the deep conditioner the day of the appointment — a little texture is your friend.', 3),
      (slug_var, 'Can you accommodate a headpiece, veil, or tiara?',
        'Yes — bring it to the appointment so we can place pins where the piece will sit. A trial run a few weeks before the event is the best way to lock in placement.', 4);
  END IF;

  -- Threading — target: "eyebrow threading glendale" (90/mo, low competition)
  slug_var := 'facial-hair-removal-thread-wax';
  IF NOT EXISTS (SELECT 1 FROM public.service_faqs WHERE service_slug = slug_var) THEN
    INSERT INTO public.service_faqs (service_slug, question, answer, sort_order) VALUES
      (slug_var, 'Do you do eyebrow threading?',
        'Yes — eyebrow shaping by threading is one of our most-booked facial services. Threading gives sharper definition than waxing because each hair is removed individually, and it suits sensitive skin that reacts to wax.', 1),
      (slug_var, 'Does threading hurt?',
        'Threading has a brief pinching sensation as each row of hair is lifted, but it passes quickly and most clients describe it as more tolerable than wax. The skin is also less likely to flush red afterward.', 2),
      (slug_var, 'How long does eyebrow threading last?',
        'Most clients return every 3–4 weeks for upkeep. Brow tinting (a separate add-on) extends the look between threading visits by darkening the fine baby hairs the thread cannot pick up.', 3),
      (slug_var, 'Do you wax or thread upper lip and facial hair?',
        'Both — upper lip, chin, and full-face hair can be removed by either method. Threading is gentler on sensitive skin; waxing is faster for larger areas. We will recommend the right one at check-in.', 4),
      (slug_var, 'Can I get threading and a haircut in the same visit?',
        'Absolutely — threading runs about 10–15 minutes and slots in easily before or after a longer service like a color or cut.', 5);
  END IF;

END $$;
