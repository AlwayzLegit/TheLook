// Single canonical IP extractor used by middleware.ts and lib/auth.ts so
// the per-IP rate-limit buckets at both layers key off the same string.
// Falls back through the same header chain Vercel + Cloudflare populate
// in production, with x-forwarded-for last so it can be split correctly:
//   1. cf-connecting-ip — set by Cloudflare if the site sits behind it.
//   2. x-real-ip        — set by some reverse proxies / Nginx.
//   3. x-forwarded-for  — Vercel's standard; first value is the real
//      client IP because Vercel prepends it before forwarding any
//      client-supplied header chain.
// "unknown" only when every header is missing — usually a misbehaving
// load balancer or a request that bypassed the platform edge entirely.

type HeaderSource =
  | Headers
  | { get(name: string): string | null | undefined };

export function extractClientIp(headers: HeaderSource | null | undefined): string {
  if (!headers) return "unknown";
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
