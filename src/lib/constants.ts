// ---------- App-wide configuration constants ----------

export const RATE_LIMITS = {
  BOOKING: { limit: 8, windowMs: 15 * 60 * 1000 },
  CONTACT: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const;

export const BOOKING = {
  MAX_ADVANCE_DAYS: 60,
  // 15-min granularity gives customers enough flexibility to stack
  // their day around the booking without flooding the picker. Going
  // smaller (5/10) starts to feel cluttered; 30 was what we shipped
  // with but customers wanted finer-grained options.
  SLOT_INCREMENT_MINUTES: 15,
  // Sentinel UUID stored in the stylists table (active=false). The server
  // detects this and assigns an available real stylist before creating the
  // appointment row, so all FK constraints stay valid.
  ANY_STYLIST_ID: "00000000-0000-0000-0000-000000000001",
} as const;

export const POLLING = {
  APPOINTMENTS_MS: 15_000,
} as const;

// ---------- Service catalog ----------

export const SALON_SERVICES = [
  { category: "Haircuts", name: "Wash + Cut + Style", priceText: "$80+", priceMin: 8000, duration: 70 },
  { category: "Haircuts", name: "Clipper Cut", priceText: "$28", priceMin: 2800, duration: 25 },
  { category: "Haircuts", name: "Scissor Cut", priceText: "$40", priceMin: 4000, duration: 25 },
  { category: "Haircuts", name: "Bangs Only", priceText: "$10", priceMin: 1000, duration: 10 },
  { category: "Haircuts", name: "Beard Trim", priceText: "$15", priceMin: 1500, duration: 10 },
  { category: "Color", name: "Single Process Root Touch-Up", priceText: "$50+", priceMin: 5000, duration: 65 },
  { category: "Color", name: "Single Process Full Color", priceText: "$60+", priceMin: 6000, duration: 55 },
  { category: "Color", name: "Balayage (incl. toner)", priceText: "$220+", priceMin: 22000, duration: 180 },
  { category: "Color", name: "Full Highlights (incl. toner)", priceText: "$150+", priceMin: 15000, duration: 180 },
  { category: "Color", name: "Partial Highlights (incl. toner)", priceText: "$110+", priceMin: 11000, duration: 105 },
  { category: "Color", name: "Lowlights", priceText: "$90+", priceMin: 9000, duration: 105 },
  { category: "Color", name: "Color Gloss / Toner", priceText: "$60+", priceMin: 6000, duration: 25 },
  { category: "Color", name: "Ombré (incl. toner)", priceText: "$220+", priceMin: 22000, duration: 150 },
  { category: "Color", name: "AirTouch Seamless Highlights", priceText: "$320+", priceMin: 32000, duration: 180 },
  { category: "Color", name: "Bleaching Roots (4–6 wk)", priceText: "$100+", priceMin: 10000, duration: 90 },
  { category: "Color", name: "Full Bleaching", priceText: "$160+", priceMin: 16000, duration: 130 },
  { category: "Color", name: "Brow Tint", priceText: "$10", priceMin: 1000, duration: 25 },
  { category: "Styling", name: "Blow-Out", priceText: "$40+", priceMin: 4000, duration: 40 },
  { category: "Styling", name: "Thermal Styling (flat/curling iron)", priceText: "$60+", priceMin: 6000, duration: 60 },
  { category: "Styling", name: "Formal Updo", priceText: "$90+", priceMin: 9000, duration: 90 },
  { category: "Styling", name: "Extensions (clip-in)", priceText: "$20+", priceMin: 2000, duration: 45 },
  { category: "Styling", name: "Individual Extensions (i-tip/k-tip/tape-in)", priceText: "$300+", priceMin: 30000, duration: 120 },
  { category: "Styling", name: "Braid", priceText: "$25+", priceMin: 2500, duration: 25 },
  { category: "Treatments", name: "Custom Hair Treatment Cocktail", priceText: "$18+", priceMin: 1800, duration: 10 },
  { category: "Treatments", name: "Deep Conditioning", priceText: "$30+", priceMin: 3000, duration: 40 },
  { category: "Treatments", name: "B3 Intensive Repair & Rebonding", priceText: "$80+", priceMin: 8000, duration: 30 },
  { category: "Treatments", name: "Keratin Straightening", priceText: "$250+", priceMin: 25000, duration: 120 },
  { category: "Treatments", name: "Vitamin Smoothing (99% Natural)", priceText: "$250+", priceMin: 25000, duration: 120 },
  { category: "Treatments", name: "Scalp Oil Treatment", priceText: "$30+", priceMin: 3000, duration: 40 },
  { category: "Treatments", name: "Perm", priceText: "$90+", priceMin: 9000, duration: 80 },
  { category: "Treatments", name: "Facial Hair Removal", priceText: "$5+", priceMin: 500, duration: 10 },
];

export const SALON_STYLISTS = [
  {
    name: "Armen",
    slug: "armen",
    bio: "Trained in Moscow, Armen brings world-class expertise in coloring, cutting & styling. Great at barber fades. 17+ years experience.",
    imageUrl: "/images/gallery/gallery-02.jpg",
    specialties: JSON.stringify(["Coloring", "Barber Fades", "Cutting"]),
  },
  {
    name: "Kristina",
    slug: "kristina",
    bio: "Trained in Armenia, Kristina has 15 years of expertise in cutting & coloring for both men's & women's hair.",
    imageUrl: "/images/gallery/gallery-03.jpg",
    specialties: JSON.stringify(["Cutting", "Coloring", "Men & Women"]),
  },
  {
    name: "Alisa (Liz)",
    slug: "alisa-liz",
    bio: "With over 30 years in the industry, Alisa specializes in cutting & coloring. A true veteran of the craft.",
    imageUrl: "/images/gallery/gallery-04.jpg",
    specialties: JSON.stringify(["Cutting", "Coloring", "30+ Years"]),
  },
];

// 0=Sunday, 1=Monday, ..., 6=Saturday
export const SALON_HOURS = [
  { dayOfWeek: 0, startTime: "10:00", endTime: "17:00", isClosed: 0 }, // Sunday
  { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isClosed: 0 }, // Monday
  { dayOfWeek: 2, startTime: null, endTime: null, isClosed: 1 },       // Tuesday CLOSED
  { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", isClosed: 0 }, // Wednesday
  { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", isClosed: 0 }, // Thursday
  { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", isClosed: 0 }, // Friday
  { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", isClosed: 0 }, // Saturday
];
