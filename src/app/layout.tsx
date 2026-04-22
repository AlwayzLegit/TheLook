import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { getBranding } from "@/lib/branding";
import { BrandingProvider } from "@/components/BrandingProvider";
import { rootMetadata, jsonLd as buildJsonLd } from "@/lib/seo";

// Next.js 15 moved themeColor / colorScheme / viewport out of metadata into
// a dedicated `viewport` export. Keeping it on `metadata` triggers a build
// warning and stops the meta tag from rendering.
export const viewport: Viewport = {
  themeColor: "#282936",
};

export async function generateMetadata(): Promise<Metadata> {
  return rootMetadata();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  // Fetch branding server-side once per request so Footer / Navbar / any
  // other consumer can read it synchronously via useBranding().
  const branding = await getBranding();
  const jsonLd = await buildJsonLd();
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
        {hasTurnstile ? (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="antialiased">
        <BrandingProvider branding={branding}>{children}</BrandingProvider>
      </body>
    </html>
  );
}
