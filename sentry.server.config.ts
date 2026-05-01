import * as Sentry from "@sentry/nextjs";

// Server-side init (App Router route handlers + RSCs). No-ops unless
// the DSN is configured. 0.1 sample for traces — API-side spans
// multiply fast, especially on any polled admin endpoints.
//
// .trim() guards against trailing newline / whitespace in the env var
// which makes Sentry reject the DSN with "Invalid Sentry Dsn".
const dsn = (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "").trim();

if (dsn) {
  Sentry.init({
    dsn,
    // Match instrumentation-client.ts so server-side events tag the
    // same release as the browser bundle. Source-map upload uses
    // the same SHA via withSentryConfig in next.config.ts.
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  });
}
