import * as Sentry from "@sentry/nextjs";

// Client (browser) Sentry init. Completely no-ops when SENTRY_DSN isn't
// set — this keeps local dev and preview deploys from needing the env,
// and flipping the key on in Vercel turns capture on everywhere at once.
//
// Lower the trace-sampling rate from the scaffolded 1.0 because this is
// a production site and sampling 100% of every page view is expensive
// on both Sentry quota and client bundle size. 10% is plenty for the
// kind of traffic a single salon receives.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    // Strip noisy ResizeObserver + extension-origin errors so the owner's
    // inbox doesn't drown in events that don't represent real bugs.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      // Browser extensions pollute error traces; skip them.
      /extension:\/\//i,
      /chrome-extension:\/\//i,
    ],
  });
}
