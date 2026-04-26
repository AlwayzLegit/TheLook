import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Forum, Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import "./globals.css";
import { getBranding } from "@/lib/branding";
import { BrandingProvider } from "@/components/BrandingProvider";
import { rootMetadata, jsonLd as buildJsonLd } from "@/lib/seo";

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
    // suppressHydrationWarning on <html> + <body> is the React-recommended
    // workaround for browser extensions that mutate these root elements
    // before React hydrates (Grammarly's data-gr-*, Dark Reader's
    // data-darkreader, password managers, color-mode shims). Suppression
    // is scoped to the element itself, not its children — every nested
    // tree still hydrates strictly. This was tripping React #418 on the
    // public site for users with extensions enabled.
    <html lang="en" className={`${forum.variable} ${lato.variable}`} suppressHydrationWarning>
      <head>
        {hasTurnstile ? (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* JSON-LD lives in <body> not <head>: round-8 QA found two
            HairSalon blocks rendering on / when this script was a child
            of <head>, which Next.js's App Router streams twice in some
            configurations (initial SSR + metadata-finalisation pass).
            Moving it inside <body> with a stable Next.js Script id
            keeps the structured data discoverable to crawlers + lets
            Next dedupe by id so we never get two copies. */}
        <Script
          id="ldjson-hairsalon"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PostHogProvider>
          <BrandingProvider branding={branding}>
            {children}
            <Analytics />
            <SpeedInsights />
          </BrandingProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
