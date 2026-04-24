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
      silent: true,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
