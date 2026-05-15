export interface ServiceCategoryMeta {
  slug: string;
  category: string;           // matches DB / SALON_SERVICES category name
  title: string;              // page heading
  subtitle: string;           // short tagline
  description: string;        // SEO meta + intro paragraph
  heroImage: string;          // banner image
  bookingNote?: string;       // optional extra note shown on the page
  // Long-form, server-rendered editorial copy (one entry per
  // paragraph). The category page's service list loads client-side
  // via fetch, so a no-JS crawler (Semrush) only ever saw the hero +
  // the ~40-word `description`, which tripped "Low word count" /
  // "Low text-to-HTML ratio" on all five category pages in the
  // 2026-05-15 audit. Rendering this block from the server component
  // (app/services/[slug]/page.tsx) puts ~250 words of genuinely
  // useful, unique copy in the static HTML.
  longIntro?: string[];
}

export const SERVICE_CATEGORIES: ServiceCategoryMeta[] = [
  {
    slug: "haircuts",
    category: "Haircuts",
    title: "Haircuts",
    subtitle: "Men's, Women's & Children's Cuts",
    description:
      "Precision haircuts for the whole family — from classic clipper cuts and scissor work to wash-cut-style packages. Walk-ins welcome at The Look Hair Salon in Glendale, CA.",
    heroImage: "/images/Haircuts.jpg",
    longIntro: [
      "A great haircut is the foundation of every style, and at The Look Hair Salon in Glendale we treat it that way. Every cut starts with a genuine consultation — we look at your hair's natural growth pattern, density, and texture, talk through how much time you actually want to spend styling at home, and only then pick up the shears. Bring a photo if you have a look in mind; if you don't, that's exactly what the consultation is for.",
      "We cut for the whole family. Women's cuts range from precision bobs and long-layer shaping to full restyles and regular maintenance trims. Men's services cover classic scissor cuts, clipper cuts, low/mid/high fades, beard line-ups, and beard trims — most bookable as a quick 30-minute slot. Kids from age three and up are welcome, and we keep boosters and a lot of patience on hand. A bang trim between full visits is a fast, low-cost way to keep a style sharp.",
      "Glendale clients usually plan on every four to six weeks for short, structured shapes and six to twelve weeks for longer hair they're growing out — we'll tell you honestly how your specific cut grows back so you can time the next visit. Walk-ins are always welcome whenever a chair is open; for busy Saturdays we'd recommend booking ahead so you're matched with the stylist you want.",
    ],
  },
  {
    slug: "color",
    category: "Color",
    title: "Color & Highlights",
    subtitle: "Balayage, Ombré, Full Color & More",
    description:
      "Expert hair coloring services including balayage, highlights, ombré, root touch-ups, color gloss, and full bleaching. Vibrant, long-lasting color at The Look Hair Salon in Glendale, CA.",
    heroImage: "/images/Highlights.jpg",
    bookingNote:
      "A $50 deposit is taken at booking for color services and credited toward your final bill at the appointment. Refundable if you cancel 24+ hours in advance. Please arrive with clean, product-free hair for best results.",
    longIntro: [
      "Color is what The Look is known for in Glendale. Our color specialists work in foils, free-hand balayage, and air-touch techniques side by side, so we can dial in exactly the brightness and dimension you want rather than forcing one method onto every head of hair. Whether it's a soft sun-kissed balayage, a full single-process color, a precise root touch-up, a gloss refresh, or a complete bleach-and-tone transformation, the work is matched to your hair's history and condition.",
      "Every lightening service is paired with a B3 bond-builder to protect the hair's internal structure during processing, and balayage and highlight services include the toning step so your color walks out finished — not brassy. New to us or switching salons? Bring your current formula card or a photo of your last few appointments and we'll match or improve on what you've been getting. A consultation is built into every color appointment, so you'll know the plan and the price before any product touches your hair.",
      "Maintenance varies by service: full-coverage color and root touch-ups usually refresh every four to six weeks, while balayage and highlights hold for eight to fourteen weeks thanks to the soft grow-out. A gloss in between keeps the tone vibrant without re-lifting. Come with one to two days of unwashed hair and skip heavy styling product on the day of your appointment for the best result.",
    ],
  },
  {
    slug: "styling",
    category: "Styling",
    title: "Styling",
    subtitle: "Blowouts, Updos, Extensions & Braids",
    description:
      "Professional hair styling services — blow-outs, thermal styling, formal updos, extensions (clip-in & individual), and braids at The Look Hair Salon in Glendale, CA.",
    heroImage: "/images/Styling.jpg",
    longIntro: [
      "Styling at The Look covers everything from an everyday smooth blow-out to a full event-ready updo. A professional blow-out lasts most clients three to five days and is the easiest way to start the week polished; many Glendale regulars book a standing weekly or bi-weekly slot so they skip daily styling time at home. Thermal styling with a flat or curling iron sets a specific look for a shorter window when you need it day-of.",
      "For special occasions we build formal updos around your hair's length and texture and any accessories you're bringing — pins are placed where a veil, headpiece, or clip will actually sit, so the finished style holds through the whole event. Day-old hair holds an updo better than freshly washed, so skip the deep conditioner the morning of. For length and density on demand we offer clip-in and individual (I-tip, K-tip, tape-in) extensions, color-matched so there's no visible blend line.",
      "Whatever the service, every styling appointment opens with a quick conversation about the look you want and how long you need it to last, and a fresh wash sets the cleanest base for the finish. Booking ahead is recommended for event styling, especially Friday afternoon and Saturday slots during the spring and summer season.",
    ],
  },
  {
    slug: "treatments",
    category: "Treatments",
    title: "Treatments",
    subtitle: "Keratin, Deep Conditioning & Scalp Care",
    description:
      "Restore and rejuvenate your hair with deep conditioning, keratin straightening, vitamin smoothing, scalp oil treatments, and intensive repair at The Look Hair Salon in Glendale, CA.",
    heroImage: "/images/Treatments.jpg",
    longIntro: [
      "Treatments target a specific concern — strength, hydration, frizz, scalp health, or smoothness — and most can be added to a haircut or color appointment, though several work well as a standalone visit. If your hair has a long color history, a treatment is often the right first appointment before we touch the color at all.",
      "Our smoothing options suit the Glendale climate, where summer humidity from late spring through fall is the main reason clients book. A full keratin straightening treatment restructures the hair and holds for three to five months; vitamin smoothing is a gentler alternative that lasts roughly eight to twelve weeks. Either holds noticeably better when the application isn't rushed, so we build in the time it actually needs. Wait 48–72 hours before the first wash and use sulfate-free shampoo to extend the result.",
      "For repair and hydration, B3 Intensive Repair & Rebonding rebuilds bonds in over-processed or breaking hair, deep conditioning restores moisture to dry mid-lengths and ends, and a scalp oil treatment resets a tight or flaky scalp as part of a seasonal routine. Your stylist will recommend a cadence and the right at-home products so the result lasts between visits.",
    ],
  },
  {
    // Slug must match the category-name fallback in
    // service-categories.getSlugForCategory: "Facial Services" →
    // "facial-services". Without this entry the public services index
    // links here but [slug]/page.tsx 404s (no SERVICE_CATEGORIES match).
    // Owner can drop a dedicated hero into /admin/branding under
    // catFacial later — until then we reuse the salon-ambient shot.
    slug: "facial-services",
    category: "Facial Services",
    title: "Facial Services",
    subtitle: "Brow, Lip & Facial Hair Removal",
    description:
      "Quick, gentle facial hair removal — eyebrow shaping, upper lip, chin, and full-face threading and waxing. Drop-in friendly at The Look Hair Salon in Glendale, CA.",
    heroImage: "/images/hero/salon-main.jpg",
    longIntro: [
      "Eyebrow shaping by threading is one of our most-booked services in Glendale. Threading removes each hair individually, which gives sharper, more precise definition than waxing and suits sensitive skin that tends to react to wax. There's a brief pinching sensation as each row lifts, but it passes quickly and the skin is far less likely to flush red afterward.",
      "Beyond brows, we thread or wax the upper lip, chin, and full face — your technician will recommend the gentler method for sensitive areas and the faster one for larger areas at check-in. A brow tint is a popular add-on that darkens the fine baby hairs threading can't pick up, extending the shaped look for several weeks.",
      "Each appointment runs about ten to fifteen minutes and slots in easily before or after a longer service like a cut or color, so most clients fold it into a visit they're already making. Most return every three to four weeks to maintain shape. Drop-ins are welcome whenever a chair is open.",
    ],
  },
];

/** Look up a category config by its URL slug */
export function getCategoryBySlug(slug: string): ServiceCategoryMeta | undefined {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}

/** Look up a category config by its DB category name */
export function getCategoryByName(name: string): ServiceCategoryMeta | undefined {
  return SERVICE_CATEGORIES.find((c) => c.category === name);
}

/** Get the slug for a category name (used for linking) */
export function getSlugForCategory(categoryName: string): string {
  return getCategoryByName(categoryName)?.slug ?? categoryName.toLowerCase().replace(/\s+&\s+/g, "-and-").replace(/\s+/g, "-");
}
