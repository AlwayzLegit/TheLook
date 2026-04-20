export interface ServiceCategoryMeta {
  slug: string;
  category: string;           // matches DB / SALON_SERVICES category name
  title: string;              // page heading
  subtitle: string;           // short tagline
  description: string;        // SEO meta + intro paragraph
  heroImage: string;          // banner image
  bookingNote?: string;       // optional extra note shown on the page
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
      "A $50 deposit is required for color services — it's credited toward your final bill and refundable with 24+ hours' notice. Please arrive with clean, product-free hair for best results.",
  },
  {
    slug: "styling",
    category: "Styling",
    title: "Styling",
    subtitle: "Blowouts, Updos, Extensions & Braids",
    description:
      "Professional hair styling services — blow-outs, thermal styling, formal updos, extensions (clip-in & individual), and braids at The Look Hair Salon in Glendale, CA.",
    heroImage: "/images/Styling.jpg",
  },
  {
    slug: "treatments",
    category: "Treatments",
    title: "Treatments",
    subtitle: "Keratin, Deep Conditioning & Scalp Care",
    description:
      "Restore and rejuvenate your hair with deep conditioning, keratin straightening, vitamin smoothing, scalp oil treatments, and intensive repair at The Look Hair Salon in Glendale, CA.",
    heroImage: "/images/Treatments.jpg",
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
