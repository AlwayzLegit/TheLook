// Single source of truth for which image sources the next/image
// optimizer is willing to proxy. Callers pass
// `unoptimized={!isOptimizableImageHost(url)}` to next/image — when
// this returns false the raw URL is rendered as-is, which avoids the
// optimizer's quota and its strict allowlist.
//
// Why the runtime check exists: admins can paste arbitrary URLs into
// service / stylist / gallery photo fields. Only sources we've
// vetted should run through /_next/image; everything else needs to
// fall through as a raw <img>.
//
// Quota policy: Vercel Hobby/Pro plans cap monthly /_next/image
// transformations. When that cap blows, /_next/image returns 402
// site-wide and EVERY image going through it renders as a broken
// icon — a hard outage for a marketing site. So this function is
// conservative: it only opts URLs in when (a) the source is fixed,
// and (b) optimization actually justifies the quota burn.
//
// - Supabase Storage URLs: NO. Already served via a Cloudflare-backed
//   CDN; admin uploads write them at reasonable sizes.
// - Local /images/* paths: NO. Vercel deploys these as static assets
//   at the original URL, which serves with no quota cost. Returning
//   `true` here used to break the handful of services still pointing
//   at /images/services/... when the optimizer 402'd on 2026-05-07
//   (Round-2 incident: salon owner reported missing thumbnails on
//   /services for Bleaching Roots, Thermal Styling, and Deep
//   Conditioning — all three still had legacy local paths).
// - images.unsplash.com: YES. Source images are huge (Unsplash serves
//   originals at 4000px+) and optimizer resizing is the whole point
//   of including them.
//
// KEEP THIS LIST IN SYNC WITH next.config.ts. If you add a host /
// pathname there, add the matching test below.

export function isOptimizableImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Relative paths — Vercel serves these as static assets directly
    // at their original URL, so going through /_next/image just
    // burns the monthly transform quota for no benefit. Bypass the
    // optimizer and let the raw file serve.
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname === "images.unsplash.com") return true;
  // Supabase + everything else intentionally NOT optimizable —
  // see header comment.
  return false;
}
