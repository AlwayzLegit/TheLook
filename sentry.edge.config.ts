import * as Sentry from "@sentry/nextjs";

// Edge runtime (Next.js middleware). Same pattern as server.ts — init
// only when DSN is present. Middleware runs on every public request so
// trace sampling is kept low to avoid eating the Sentry quota.
//
// .trim() guards against trailing newline / whitespace in the env var.
const dsn = (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "").trim();

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.05,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  });
}
