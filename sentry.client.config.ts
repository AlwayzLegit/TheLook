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

// Hydration-error capture. React 18/19 doesn't surface the offending
// component name in production builds — the message is "Minified React
// error #418" with an empty stack. Wrapping window.console.error to
// detect the #418 signature lets us forward the original args (which
// include the component stack in dev / arg index in prod) to Sentry
// alongside breadcrumbs from the page load. Once Sentry events arrive
// with this extra context we can finally pinpoint which subtree on /
// is causing the residual mismatch reported in QA round 5.
if (dsn && typeof window !== "undefined") {
  const originalError = window.console.error;
  window.console.error = (...args: unknown[]) => {
    try {
      const first = args[0];
      const msg = typeof first === "string" ? first : first instanceof Error ? first.message : "";
      if (/Minified React error #418|Hydration failed/.test(msg)) {
        Sentry.captureMessage("React hydration mismatch (#418)", {
          level: "error",
          extra: {
            consoleArgs: args.map((a) =>
              a instanceof Error ? { name: a.name, message: a.message, stack: a.stack } : a,
            ),
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
        });
      }
    } catch {
      // Never let our diagnostic break the original console.error
    }
    originalError.apply(window.console, args as Parameters<typeof console.error>);
  };
}
