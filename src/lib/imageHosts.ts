// Single source of truth for which remote image hosts the next/image
// optimizer is willing to proxy. Mirrors next.config.ts's
// `images.remotePatterns` so callers can decide whether to pass
// `unoptimized` instead of falling back to a raw <img> tag.
//
// Why the runtime check exists: admins can paste arbitrary URLs into
// service / stylist / gallery photo fields. URLs from
// images.unsplash.com optimize fine; anything else (Yelp avatars,
// Instagram CDN, an old stock site, etc.) was silently 400-ing
// inside /_next/image and rendering as a broken-image icon. Pass
// `unoptimized={!isOptimizableImageHost(url)}` to next/image and the
// unknown-host case becomes "loaded as-is" — no broken image, but no
// Next-side optimization either, which is the right trade-off for
// CMS-driven content.
//
// Supabase Storage URLs deliberately return false here. Two reasons:
// (1) Vercel Hobby/Pro plans cap monthly /_next/image transformations
//     and we exhausted the quota on 2026-05-07, returning 402 site-
//     wide for every Supabase-hosted CMS image (service heroes,
//     stylist headshots, before/after pairs).
// (2) Supabase Storage already serves images via a Cloudflare-backed
//     CDN with sane caching, and uploads through /admin go through
//     /api/admin/upload which writes them at reasonable sizes. The
//     marginal benefit of double-running them through Next's
//     optimizer doesn't justify the quota burn.
//
// KEEP THIS LIST IN SYNC WITH next.config.ts. If you add a host /
// pathname there, add the matching test below.

export function isOptimizableImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Relative paths (`/images/foo.jpg`) ARE served from our own host
    // and always optimize fine.
    if (url.startsWith("/")) return true;
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname === "images.unsplash.com") return true;
  // Supabase intentionally NOT optimizable — see header comment.
  return false;
}
