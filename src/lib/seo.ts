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
