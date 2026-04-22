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
  async rewrites() {
    return [
      { source: "/privacy-policy", destination: "/privacy" },
      { source: "/terms-and-conditions", destination: "/terms" },
    ];
  },
};

export default nextConfig;
