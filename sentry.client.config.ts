import * as Sentry from "@sentry/nextjs";

// Client (browser) Sentry init. Completely no-ops when the DSN isn't
// set — keeps local dev and preview deploys from needing the env, and
// flipping the key on in Vercel turns capture on everywhere at once.
//
// .trim() guard: Vercel's env-var UI sometimes preserves a trailing
// newline depending on how the value was pasted, which makes Sentry
// reject the DSN at runtime with "Invalid Sentry Dsn" and silently
// skip every captureMessage. The trim makes init resilient to that.
const dsn = (process.env.NEXT_PUBLIC_SENTRY_DSN || "").trim();

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
