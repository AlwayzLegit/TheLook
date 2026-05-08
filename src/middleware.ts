import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractClientIp } from "@/lib/ip";

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // CSP allow-list. Stripe.js needs:
  //   script-src  js.stripe.com                  (the loader)
  //   connect-src api.stripe.com + m.stripe.network (XHR to Stripe)
  //   frame-src   js.stripe.com + hooks.stripe.com (Elements iframes)
  //   img-src     *.stripe.com                    (card-brand icons)
  // Supabase Storage (stylist photos, service photos) lives on
  // *.supabase.co/storage/v1/object/public/** — without explicit
  // img-src clearance the browser blocks every uploaded photo even
  // though the URL is otherwise 200. Admin uploads also write directly
  // to the storage REST API so connect-src needs *.supabase.co too.
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://images.unsplash.com https://static.wixstatic.com https://*.stripe.com https://*.supabase.co data: blob:",
    "connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
    "frame-src https://challenges.cloudflare.com https://www.google.com https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
  ].join("; "),
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// Routes that actually need the NextAuth session check. Public routes
// (everything else) skip the auth() wrapper entirely so NextAuth doesn't
// set a __Secure-authjs.callback-url cookie on public GETs — Supabase's
// advisor flagged this as P3-5.
function needsAuth(pathname: string): boolean {
  if (pathname === "/admin/login") return false;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  return false;
}

// Mirrors lib/roles.ts isAdminOrManager(). Stylist accounts can hold a
// session for portal lookups but must not reach the admin UI/API.
const ADMIN_ROLES = new Set(["admin", "manager"]);

const authCheck = auth((req) => {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const role = req.auth?.user?.role;
  const allowed = !!req.auth && (!role || ADMIN_ROLES.has(role));

  if (!req.auth) {
    if (isApi) {
      return addSecurityHeaders(
        new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/admin/login", req.url)));
  }
  if (!allowed) {
    if (isApi) {
      return addSecurityHeaders(
        new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/admin/login?error=forbidden", req.url)));
  }
  return addSecurityHeaders(NextResponse.next());
}) as unknown as (request: NextRequest) => Promise<NextResponse>;

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  // Edge rate-limit on the NextAuth credentials submit
  // (POST /api/auth/callback/credentials — that's the only path the
  // login form actually hits; cowork's QA spec assumed a custom
  // /api/admin/auth/login that doesn't exist). Three layers stack:
  //   1. This middleware:    per-IP, 10/15min. Bounces brute-force
  //      traffic before NextAuth's authorize() hook runs at all so
  //      WAF / ops dashboards see the 429 spike.
  //   2. lib/auth.ts authorize() per-email rl: 10/15min. Stops slow
  //      password-spray attacks on a known admin email even when the
  //      attacker rotates source IPs.
  //   3. lib/auth.ts authorize() DB-backed IP cap: 30/15min counted
  //      from admin_log. Defence-in-depth in case middleware buckets
  //      diverge across edge POPs (in-memory fallback when Upstash is
  //      down isn't shared between instances).
  // NextAuth swallows all three into a generic "Invalid credentials"
  // response so attackers can't enumerate which gate fired.
  if (
    request.method === "POST" &&
    request.nextUrl.pathname.startsWith("/api/auth/callback/credentials")
  ) {
    const ip = extractClientIp(request.headers);
    const limit = 10;
    const windowMs = 15 * 60 * 1000;
    const rl = await checkRateLimit({
      key: `auth-edge-ip:${ip}`,
      limit,
      windowMs,
    });
    if (!rl.ok) {
      // Audit the cap firing so admin_log captures the 11th attempt
      // (the round-8 finding was a missing row when middleware blocks).
      // Fire-and-forget — never block the 429 response on a write.
      // Lazy-import so the edge runtime doesn't pull supabase + auditLog
      // into the middleware bundle when it's not needed.
      try {
        const { logAuthEvent } = await import("./lib/auditLog");
        logAuthEvent("auth.login.locked", null, {
          ip,
          reason: "ip_edge_capped",
          userAgent: request.headers.get("user-agent"),
        }).catch(() => {});
      } catch {
        /* never let audit failure block rate-limit response */
      }
      // Cache-Control: no-store keeps the CDN from accidentally caching
      // a 429 and serving it to a different client. Vary names every
      // header that affects the keying so any well-behaved cache that
      // ignores no-store still partitions per-IP.
      return addSecurityHeaders(
        new NextResponse(
          JSON.stringify({ error: "Too many login attempts. Try again in a few minutes." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, max-age=0",
              "Vary": "cf-connecting-ip, x-real-ip, x-forwarded-for",
              "Retry-After": String(Math.ceil(windowMs / 1000)),
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
            },
          },
        ),
      );
    }
  }

  if (needsAuth(request.nextUrl.pathname)) {
    return authCheck(request);
  }
  // Public path — pass through, still apply security headers.
  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * This ensures security headers are applied broadly while
     * keeping static asset serving fast.
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
