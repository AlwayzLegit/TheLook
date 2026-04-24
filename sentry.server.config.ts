import * as Sentry from "@sentry/nextjs";

// Server-side init (App Router route handlers + RSCs). No-ops unless
// SENTRY_DSN is configured. 0.1 sample for traces — API-side spans
// multiply fast, especially on any polled admin endpoints.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  });
}
