import type { Metadata } from "next";
import { getBranding, telHref, type Branding } from "@/lib/branding";

const siteUrl = (() => {
  const raw = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  return raw.startsWith("http") ? raw : `https://${raw}`;
})();

// Location-specific metadata that isn't branding (geo, city, site URL).
// Kept hardcoded because they're tied to the Glendale storefront, not the
// salon name. If the owner opens a second location, this gets split.
const LOCATION = {
  city: "Glendale",
  region: "CA",
  postalCode: "91204",
  country: "US",
  latitude: 34.1425,
  longitude: -118.2553,
  siteUrl,
  heroImage: "/images/hero/salon-main.jpg",
};

// Social + aggregate review handles that don't change with a name edit.
const SOCIAL = {
  instagram: "https://www.instagram.com/thelookhairsalon/",
  facebook: "https://www.facebook.com/p/The-Look-Hair-Salon-100046925091028/",
  yelp: "https://www.yelp.com/biz/the-look-hair-salon-glendale",
};

// Root-layout metadata. Pulled in from generateMetadata() so every page
// inherits DB-backed title + description + OG tags. getBranding() is
// already wrapped in unstable_cache (60s + tag invalidation) so this
// stays cheap and keeps pages statically prerenderable.
export async function rootMetadata(): Promise<Metadata> {
  const brand = await getBranding();
  return {
    metadataBase: new URL(siteUrl),
    manifest: "/manifest.json",
    title: `${brand.name} | Beauty Hair Salon | ${LOCATION.city}, ${LOCATION.region}`,
    description: brand.tagline,
    keywords: [
      "hair salon",
      LOCATION.city,
      LOCATION.region,
      "haircut",
      "color",
      "balayage",
      "ombre",
      "highlights",
      "extensions",
      "styling",
      "keratin",
      brand.name,
    ],
    openGraph: {
      title: `${brand.name} | ${LOCATION.city}, ${LOCATION.region}`,
      description: brand.tagline,
      type: "website",
      locale: "en_US",
      siteName: brand.name,
      images: [
        {
          url: LOCATION.heroImage,
          width: 1200,
          height: 630,
          alt: `${brand.name} - ${LOCATION.city}, ${LOCATION.region}`,
        },
      ],
    },
    robots: { index: true, follow: true },
  };
}

// schema.org LocalBusiness / HairSalon JSON-LD. Dropped into the <head>
// of the root layout so Google's Knowledge Panel, Apple Maps, and other
// crawlers read the DB-backed values.
export async function jsonLd(): Promise<Record<string, unknown>> {
  const brand = await getBranding();
  const [streetAddress] = brand.address.split(",");
  // Convert "+1 818 662 5665" / "(818) 662-5665" → "+18186625665" for
  // the schema.org `telephone` field (E.164).
  const tel = telHref(brand.phone).replace(/^tel:/, "");
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: brand.name,
    description: brand.tagline,
    url: LOCATION.siteUrl,
    telephone: tel,
    email: brand.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: streetAddress.trim(),
      addressLocality: LOCATION.city,
      addressRegion: LOCATION.region,
      postalCode: LOCATION.postalCode,
      addressCountry: LOCATION.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: LOCATION.latitude,
      longitude: LOCATION.longitude,
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "10:00", closes: "18:00" },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:00",
        closes: "18:00",
      },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "10:00", closes: "17:00" },
    ],
    priceRange: "$",
    image: `${LOCATION.siteUrl}${LOCATION.heroImage}`,
    sameAs: [SOCIAL.instagram, SOCIAL.facebook, SOCIAL.yelp],
    foundingDate: "2011-11-11",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.2",
      reviewCount: "830",
      bestRating: "5",
    },
  };
}

// Per-page metadata helper — lets any route do
//   export const generateMetadata = () => pageMetadata({ title, description })
// without having to re-fetch branding manually.
export async function pageMetadata(opts: {
  title: string;
  description?: string;
  descriptionFor?: (b: Branding) => string;
}): Promise<Metadata> {
  const brand = await getBranding();
  const description = opts.descriptionFor ? opts.descriptionFor(brand) : opts.description;
  return {
    title: `${opts.title} | ${brand.name}`,
    ...(description ? { description } : {}),
  };
}

// Resolve a relative path against the canonical site URL — JSON-LD
// requires absolute URLs in @id / itemListElement entries.
function abs(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

// schema.org FAQPage. Caller passes the same Q/A list rendered on the
// page so Google's rich-result preview matches what visitors see — any
// drift between the two would disqualify the page from FAQ snippets.
export function faqJsonLd(faqs: ReadonlyArray<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

// schema.org BreadcrumbList. Items are passed in display order (root
// first, current page last). Relative URLs are resolved against the
// site URL so Google sees absolute @id values.
export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

// schema.org Person. Used on /team/[slug] to feed the Knowledge Panel
// and surface stylist names in "balayage Glendale" type queries. Empty
// fields are omitted so we don't ship blank strings to Google.
export async function personJsonLd(person: {
  name: string;
  jobTitle?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
  knowsAbout?: ReadonlyArray<string>;
}): Promise<Record<string, unknown>> {
  const brand = await getBranding();
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    worksFor: {
      "@type": "HairSalon",
      name: brand.name,
      url: siteUrl,
    },
  };
  if (person.jobTitle) data.jobTitle = person.jobTitle;
  if (person.bio) data.description = person.bio;
  if (person.imageUrl) data.image = abs(person.imageUrl);
  if (person.slug) data.url = abs(`/team/${person.slug}`);
  if (person.knowsAbout && person.knowsAbout.length > 0) {
    data.knowsAbout = [...person.knowsAbout];
  }
  return data;
}

// schema.org ItemList for /team — Google uses this to understand the
// page is a roster, not a single profile. Each entry points at the
// stylist's detail page so the crawler can follow.
export function teamItemListJsonLd(
  members: ReadonlyArray<{ name: string; slug: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: members.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(`/team/${m.slug}`),
      name: m.name,
    })),
  };
}
