import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // A2P 10DLC / SMS-carrier friendly URLs — carriers reviewing the
  // registration expect /privacy-policy and /terms-and-conditions to
  // return 200. Rewrite serves the same content without a visible
  // redirect, so both URL forms work transparently.
  //
  // The /ingest rewrites proxy PostHog behind our own domain so ad
  // blockers / privacy extensions don't drop analytics events. Host
  // overridable via NEXT_PUBLIC_POSTHOG_HOST when using the EU cluster.
  async rewrites() {
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST || "https://us.i.posthog.com";
    const posthogAssets = process.env.NEXT_PUBLIC_POSTHOG_ASSET_HOST || "https://us-assets.i.posthog.com";
    return [
      { source: "/privacy-policy", destination: "/privacy" },
      { source: "/terms-and-conditions", destination: "/terms" },
      { source: "/ingest/static/:path*", destination: `${posthogAssets}/static/:path*` },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
      { source: "/ingest/decide", destination: `${posthogHost}/decide` },
    ];
  },
  // PostHog sends responses with a wildcard host header — lift Next's
  // trailing-slash restriction so the rewrite passes through cleanly.
  skipTrailingSlashRedirect: true,
  // Legacy / colloquial paths that don't match a current canonical URL.
  // Permanent (308) so search engines / browsers learn the canonical
  // URL after one hit. Add new entries here when the owner renames a
  // route and we want stale inbound links to land somewhere useful
  // instead of a 404.
  async redirects() {
    return [
      // Apex → www. Round-27 SEO audit (2026-05-11) was crawling both
      // hosts as separate domains, doubling every audit failure count
      // and splitting SEO authority. www is the canonical host
      // everywhere else (sitemap, NEXTAUTH_URL, OG tags, branding) so
      // we collapse onto it here. 308 = permanent + method-preserving,
      // matching what Vercel's domain-redirect feature would emit.
      {
        source: "/:path*",
        has: [{ type: "host", value: "thelookhairsalonla.com" }],
        destination: "https://www.thelookhairsalonla.com/:path*",
        permanent: true,
      },
      // Renamed service slug — kept around because the old URL still
      // sits in some inbound search results and shared links.
      {
        source: "/services/item/balayage",
        destination: "/services/item/balayage-incl-toner",
        permanent: true,
      },
      // Round-27 audit found three stylist slugs that were renamed
      // but still indexed by Google as live URLs. Redirect each to
      // the current canonical slug to preserve the SEO authority
      // accumulated on the old URLs.
      {
        source: "/team/alisa-h",
        destination: "/team/alisa-liz",
        permanent: true,
      },
      {
        source: "/team/armen-p",
        destination: "/team/armen",
        permanent: true,
      },
      {
        source: "/team/kristina-g",
        destination: "/team/kristina",
        permanent: true,
      },
      // Legacy CMS-era paths still showing up as 4xx errors in the
      // 2026-05-11 SEO audit. Each used to be a real page on the old
      // Wix/Squarespace build before the Next.js migration.
      {
        source: "/about-1",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/services-1",
        destination: "/services",
        permanent: true,
      },
      // Note: /terms-and-conditions is a rewrite (above) so it serves
      // /terms content with the original URL — required by Twilio's
      // A2P 10DLC review. The variant below (without "and") is a true
      // legacy URL and gets a 308 redirect to the canonical.
      {
        source: "/term-conditions",
        destination: "/terms",
        permanent: true,
      },
    ];
  },
};

// Wrap with Sentry's webpack plugin ONLY when a DSN + auth token are
// configured in the environment. Without the auth token Sentry's build
// step uploads nothing but also logs a noisy warning; without the DSN
// there's nothing to instrument at runtime so wrapping is pure waste.
// This keeps local / preview builds quiet and lets prod opt in by
// simply setting the env vars in Vercel.
const shouldWrapSentry = Boolean(
  process.env.SENTRY_DSN &&
    process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

export default shouldWrapSentry
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Pin the source-map-upload release to the deploy commit SHA.
      // Round-13 QA caught events arriving with a stale release tag
      // (round-8 era 07ec06dc...) while production was running
      // 4d6c52b — Sentry couldn't symbolicate because the uploaded
      // maps belonged to a different chunk-filename set. Setting
      // release here makes withSentryConfig export SENTRY_RELEASE
      // into the bundle's env so the runtime SDK auto-tags events
      // with the same value, keeping client + server + maps lined
      // up automatically.
      release: { name: process.env.VERCEL_GIT_COMMIT_SHA },
      // silent:true was hiding the source-map upload status in build
      // logs, which made it impossible to tell from CI whether the
      // upload step actually ran. Now visible.
      silent: false,
      widenClientFileUpload: true,
      // tunnelRoute removed — it adds a /monitoring rewrite that Vercel
      // sometimes proxies through the same edge as our middleware,
      // adding latency without much benefit at this traffic volume.
      // disableLogger + automaticVercelMonitors moved out — they were
      // deprecated as top-level options in @sentry/nextjs 10.x.
    })
  : nextConfig;
