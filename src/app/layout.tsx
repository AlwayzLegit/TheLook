import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Look Hair Salon | Glendale, CA",
  description:
    "Premium hair salon in Glendale, CA offering cuts, color, styling, and treatments. Book your appointment today.",
  keywords: ["hair salon", "Glendale", "CA", "haircut", "color", "styling", "balayage", "bridal hair"],
  openGraph: {
    title: "The Look Hair Salon | Glendale, CA",
    description:
      "Premium hair salon in Glendale, CA offering cuts, color, styling, and treatments.",
    type: "website",
    locale: "en_US",
    siteName: "The Look Hair Salon",
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
    "Premium hair salon in Glendale, CA offering cuts, color, styling, and treatments.",
  url: "https://www.thelookhairsalonla.com",
  telephone: "+18185551234",
  email: "info@thelookhairsalonla.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "919 South Central Avenue",
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
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "10:00",
      closes: "17:00",
    },
  ],
  priceRange: "$$",
  image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80",
  sameAs: [
    "https://www.instagram.com/thelookhairsalon/",
    "https://www.facebook.com/thelookhairsalon",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "127",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Forum&family=Lato:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
