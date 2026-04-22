import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Forum, Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import "./globals.css";

// Self-hosted Google Fonts via next/font — eliminates the render-blocking
// <link> to fonts.googleapis.com, handles subsetting + preload + CSS
// inlining automatically. Matches the two tokens already declared in
// globals.css (--font-heading, --font-body) via CSS variables.
const forum = Forum({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});
const lato = Lato({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const siteUrl = (() => {
  const raw = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  return raw.startsWith("http") ? raw : `https://${raw}`;
})();

// Next.js 15 moved themeColor / colorScheme / viewport out of metadata into
// a dedicated `viewport` export. Keeping it on `metadata` triggers a build
// warning and stops the meta tag from rendering.
export const viewport: Viewport = {
  themeColor: "#282936",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.json",
  title: "The Look Hair Salon | Beauty Hair Salon | Glendale, CA",
  description:
    "Family owned & operated since 2011. Over 25 years in the beauty industry — specializing in cutting, coloring, balayage, ombré, highlights, extensions & styling in Glendale, CA.",
  keywords: [
    "hair salon",
    "Glendale",
    "CA",
    "haircut",
    "color",
    "balayage",
    "ombre",
    "highlights",
    "extensions",
    "styling",
    "keratin",
    "The Look Hair Salon",
  ],
  openGraph: {
    title: "The Look Hair Salon | Glendale, CA",
    description:
      "Family owned & operated since 2011. Highest quality hair salon services in Glendale at unbeatable prices.",
    type: "website",
    locale: "en_US",
    siteName: "The Look Hair Salon",
    images: [
      {
        url: "/images/hero/salon-main.jpg",
        width: 1200,
        height: 630,
        alt: "The Look Hair Salon - Glendale, CA",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: "The Look Hair Salon",
  description:
    "Family owned & operated since 2011. Over 25 years in the beauty industry — highest quality hair salon services in Glendale at unbeatable prices.",
  url: "https://www.thelookhairsalonla.com",
  telephone: "+18186625665",
  email: "thelook_hairsalon@yahoo.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "919 South Central Ave Suite #E",
    addressLocality: "Glendale",
    addressRegion: "CA",
    postalCode: "91204",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 34.1425,
    longitude: -118.2553,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Monday",
      opens: "10:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "10:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "10:00",
      closes: "17:00",
    },
  ],
  priceRange: "$",
  // Self-hosted so the JSON-LD doesn't depend on a third-party CDN we
  // don't control. Drop a representative storefront photo at this path
  // (1200x630 minimum for rich-result eligibility) — falls back to the
  // hero image used for OpenGraph if missing.
  image: `${siteUrl}/images/hero/salon-main.jpg`,
  sameAs: [
    "https://www.instagram.com/thelookhairsalon/",
    "https://www.facebook.com/p/The-Look-Hair-Salon-100046925091028/",
    "https://www.yelp.com/biz/the-look-hair-salon-glendale",
  ],
  foundingDate: "2011-11-11",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.2",
    reviewCount: "830",
    bestRating: "5",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  return (
    <html lang="en" className={`${forum.variable} ${lato.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {hasTurnstile ? (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="antialiased">
        <PostHogProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </PostHogProvider>
      </body>
    </html>
  );
}
