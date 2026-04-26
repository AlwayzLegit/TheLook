import * as Sentry from "@sentry/nextjs";

// Client (browser) Sentry init. Renamed from sentry.client.config.ts
// per Next.js 15.4+ instrumentation contract (Turbopack will break the
// old name in a future release). No-ops when the DSN isn't set so
// local dev and preview deploys without Sentry env vars stay quiet.
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

// Hydration-error capture, dual-path. React 18/19 doesn't surface the
// offending component name in production builds — the message is
// "Minified React error #418" with an empty stack. Wrapping
// window.console.error to detect the #418 signature lets us forward
// the original args (which include the component stack in dev / arg
// index in prod) so we can finally identify the mismatching subtree.
//
// Round-6 QA confirmed Sentry's transport is on every default adblock
// list, which means captures CAN silently fail in real users' browsers.
// We mirror the capture into our own /api/internal/hydration-error
// endpoint (writes to admin_log with action=client.hydration_mismatch)
// so the data lands SOMEWHERE the owner can read, regardless of
// whether Sentry was reachable from the reporter's browser.
if (typeof window !== "undefined") {
  const originalError = window.console.error;
  window.console.error = (...args: unknown[]) => {
    try {
      const first = args[0];
      const msg = typeof first === "string" ? first : first instanceof Error ? first.message : "";
      if (/Minified React error #418|Hydration failed/.test(msg)) {
        const payload = {
          consoleArgs: args.map((a) =>
            a instanceof Error ? { name: a.name, message: a.message, stack: a.stack } : a,
          ),
          url: window.location.href,
          userAgent: navigator.userAgent,
          // Capture useful client-side context that helps narrow the
          // mismatch source: known body-attr injections from common
          // browser extensions, viewport size (different SSR cache
          // layers can produce different responsive markup), and
          // anything in localStorage that might gate-render.
          bodyAttrs:
            typeof document !== "undefined"
              ? Array.from(document.body.attributes)
                  .map((a) => `${a.name}=${a.value}`)
                  .filter((s) => !s.startsWith("class="))
                  .slice(0, 20)
              : [],
          viewport:
            typeof window !== "undefined"
              ? `${window.innerWidth}x${window.innerHeight}`
              : null,
          timestamp: new Date().toISOString(),
        };

        // Send to Sentry first (best-effort).
        if (dsn) {
          try {
            Sentry.captureMessage("React hydration mismatch (#418)", {
              level: "error",
              extra: payload,
            });
          } catch {
            // never let Sentry path crash the diagnostic
          }
        }

        // Mirror to our admin_log via the dedicated capture endpoint.
        // Uses fetch with keepalive:true so the request survives a
        // page navigation that follows the error.
        try {
          fetch("/api/internal/hydration-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
            // Don't surface a network error in the console — that
            // would itself trigger another console.error and risk
            // a loop. The endpoint is fire-and-forget by design.
          }).catch(() => {});
        } catch {
          // localStorage / fetch threw — give up silently
        }
      }
    } catch {
      // Never let our diagnostic break the original console.error
    }
    originalError.apply(window.console, args as Parameters<typeof console.error>);
  };
}
