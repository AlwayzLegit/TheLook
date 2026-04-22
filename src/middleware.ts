import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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
    "connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.supabase.co wss://*.supabase.co",
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

const authCheck = auth((req) => {
  if (!req.auth) {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/api/admin")) {
      return addSecurityHeaders(
        new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/admin/login", req.url)));
  }
  return addSecurityHeaders(NextResponse.next());
}) as unknown as (request: NextRequest) => Promise<NextResponse>;

export default async function middleware(request: NextRequest): Promise<NextResponse> {
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
