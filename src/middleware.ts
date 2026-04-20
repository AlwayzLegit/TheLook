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
  // Without these, loadStripe() rejects with a CSP violation and the
  // booking form falls back to the "having trouble loading" panel.
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://images.unsplash.com https://static.wixstatic.com https://*.stripe.com data:",
    "connect-src 'self' https://api.stripe.com https://m.stripe.network",
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

// NextAuth v5 middleware: `auth` wraps the handler and injects `req.auth`.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    if (!req.auth) {
      if (isAdminApi) {
        return addSecurityHeaders(
          new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      const loginUrl = new URL("/admin/login", req.url);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}) as unknown as (request: NextRequest) => Promise<NextResponse>;

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
