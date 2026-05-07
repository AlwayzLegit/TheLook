import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { clientKey, loginLimiter } from "@/lib/ratelimit";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const isLoginPage = nextUrl.pathname === "/admin/login";
  const isApiAdmin = nextUrl.pathname.startsWith("/api/admin");
  const isCredentialsPost =
    req.method === "POST" && nextUrl.pathname === "/api/auth/callback/credentials";

  if (isCredentialsPost) {
    const rl = await loginLimiter.limit(clientKey(req));
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() },
        },
      );
    }
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (isApiAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/admin/login", nextUrl);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/callback/credentials"],
};
