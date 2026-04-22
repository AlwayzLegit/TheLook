import type { NextConfig } from "next";

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

export default nextConfig;
