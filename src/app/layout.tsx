import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Forum, Lato } from "next/font/google";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { VercelTelemetry } from "@/components/providers/VercelTelemetry";
import "./globals.css";
import { getBranding } from "@/lib/branding";
import { BrandingProvider } from "@/components/BrandingProvider";
import { rootMetadata } from "@/lib/seo";

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
        {/* HairSalon JSON-LD now lives in app/page.tsx so it only
            renders on the home page. Round-9 QA found we were
            emitting it on every page that uses the root layout
            (/services, /about, /team, etc.) which Google flags as
            duplicate organization schema. */}
        <PostHogProvider>
          <BrandingProvider branding={branding}>
            {children}
            <VercelTelemetry />
          </BrandingProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
