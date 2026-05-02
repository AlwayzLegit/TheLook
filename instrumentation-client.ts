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

// Sentry/Next.js 15.5+ contract — re-export the navigation hook so
// SPA route changes show up as transactions in Sentry. Without this
// the build emits an "ACTION REQUIRED" warning and route-level
// performance traces are missing. No-ops at runtime when DSN isn't
// set because Sentry.init never ran.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

if (dsn) {
  Sentry.init({
    dsn,
    // Pin the release to the deploy commit SHA so the events Sentry
    // receives are tagged with the SAME identifier the build-time
    // sourcemap upload uses. Round-13 QA caught events arriving with
    // a stale release (07ec06dc — round-8 era) while production was
    // running 4d6c52b — so symbolication couldn't match the new
    // bundle's chunk filenames against the old release's maps.
    // VERCEL_GIT_COMMIT_SHA is auto-injected by Vercel on every
    // build; falls back to undefined locally where it doesn't matter.
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
    // Tunnel through our own domain so ad-blockers (Brave shields,
    // uBlock, Ghostery, AdGuard) don't filter the ingest. Round-10
    // confirmed that #418 hydration capture was working but
    // *.sentry.io was being blocked at the network layer for many
    // visitors, so the symbolicated stack frames never reached
    // Sentry. /api/monitoring proxies the envelope to ingest after
    // verifying the DSN belongs to this project. Path matches the
    // route handler at src/app/api/monitoring/route.ts — the
    // round-12 QA caught this missing the /api prefix.
    tunnel: "/api/monitoring",
    // Force keepalive on every envelope POST. Round-15 retest found
    // hydration captures (the original target) reached the tunnel
    // but never landed at Sentry — the most likely cause is React
    // unmounting / re-rendering immediately after #418 fires, which
    // cancels in-flight fetches. keepalive:true tells the browser to
    // let the request finish even after the document is gone. Same
    // flag the DB-fallback (/api/internal/hydration-error) already
    // uses for the same reason.
    transportOptions: {
      fetchOptions: { keepalive: true },
    },
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
    // Drop the default Dedupe integration only for hydration captures.
    // Round-15 QA caught the SDK accepting captureException (returning
    // a truthy eventId) but Sentry never receiving the event; the
    // synthetic error has identical message + top stack frame across
    // every #418, which is exactly the shape Dedupe collapses. Other
    // (non-hydration) events still benefit from Dedupe so a real loop
    // doesn't flood the project.
    integrations: (defaults) =>
      defaults.map((integration) => {
        if (integration.name !== "Dedupe") return integration;
        const original = integration.processEvent?.bind(integration);
        if (!original) return integration;
        return {
          ...integration,
          processEvent(event: Sentry.Event, ...rest: unknown[]) {
            // Pass hydration-tagged events through untouched so Dedupe
            // can't collapse them. Everything else still goes through
            // the normal dedupe pipeline.
            if (event.tags?.hydration === "true") return event;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (original as any)(event, ...rest);
          },
        };
      }),
    // Diagnostic beforeSend: log every hydration-tagged event right
    // before transport so we can confirm the SDK is actually sending
    // it (vs being filtered post-captureException by an integration).
    // Round-15 QA established three checkpoints — captureException
    // returns an eventId, admin_log records it, beforeSend logs it,
    // Sentry receives it — and any gap between two of those isolates
    // the failure. Always returns the event unchanged; pure diagnostic.
    beforeSend(event) {
      if (event.tags?.hydration === "true") {
        const msg =
          event.exception?.values?.[0]?.value ||
          event.message ||
          "(no message)";
        // eslint-disable-next-line no-console
        console.warn(
          `[hydration-capture] beforeSend eventId=${event.event_id} fp=${JSON.stringify(event.fingerprint)} msg=${msg}`,
        );
      }
      return event;
    },
  });
}

// Hydration-error capture, dual-path. React 18/19 doesn't surface the
// offending component name in production builds — the message is
// "Minified React error #418" with an empty stack. There are TWO ways
// production React surfaces this and we have to handle both:
//
//   a) console.error('Minified React error #%s; visit %s ...', 418, url)
//      — printf-style template, the digits live in the args array, not
//        in args[0]. The previous match logic (regex against args[0])
//        missed this entirely (round-7 QA confirmed). Now we stringify
//        every arg and match the joined message.
//
//   b) window.addEventListener('error', (event) => event.error.message)
//      — React 18.3+ in production rethrows hydration mismatches as
//        uncaught errors that don't always go through console.error.
//        We attach a backup listener so neither shape escapes.
//
// Round-7 QA confirmed Sentry's transport is on every default adblock
// list AND the prod CSP didn't include *.sentry.io in connect-src
// (now fixed in middleware.ts). We mirror every capture into our own
// /api/internal/hydration-error endpoint (writes admin_log with action
// =client.hydration_mismatch) so the data lands SOMEWHERE the owner
// can read regardless of Sentry's transport health.

if (typeof window !== "undefined") {
  // Same-shape detector used by both capture paths.
  const HYDRATION_PATTERN =
    /Minified React error #(?:418|421|423|425|%s)|Hydration failed|There was an error while hydrating|Text content does not match server-rendered HTML/;

  function buildPayload(rawArgs: unknown[]): Record<string, unknown> {
    return {
      consoleArgs: rawArgs.map((a) =>
        a instanceof Error ? { name: a.name, message: a.message, stack: a.stack } : a,
      ),
      url: window.location.href,
      userAgent: navigator.userAgent,
      // Capture useful client-side context that helps narrow the
      // mismatch source: known body-attr injections from common
      // browser extensions (Grammarly's data-gr-*, Dark Reader's
      // data-darkreader, ColorZilla's cz-shortcut-listen), viewport
      // size (different SSR cache layers can produce different
      // responsive markup), and document title at the moment of
      // capture (sometimes hints at routing-level mismatches).
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
      documentTitle: typeof document !== "undefined" ? document.title : null,
      timestamp: new Date().toISOString(),
    };
  }

  // Pull the original Error (preferred) or build a synthetic one
  // whose `.stack` is the captured frame string. Sentry's debug-id
  // matcher only runs on `exception.values[].stacktrace.frames` —
  // round-9 QA confirmed that captureMessage() with a stack stuffed
  // into `extras` will NOT symbolicate even when source maps are
  // uploaded (which they are, via the build-time Sentry plugin).
  //
  // Round-15 QA isolated a silent drop: Sentry's GlobalHandlers
  // integration captures the window.error first and stamps the
  // Error object with __sentry_captured__. When our listener then
  // calls Sentry.captureException(event.error), the SDK
  // short-circuits at the marker, returns the cached eventId, and
  // never invokes the rest of the pipeline (beforeSend, transport).
  // Cloning the Error into a fresh instance — same message, same
  // stack — strips the marker so our hydration-tagged capture goes
  // through cleanly.
  function buildException(
    source: "console.error" | "window.error",
    rawArgs: unknown[],
  ): Error {
    const directError = rawArgs.find((a) => a instanceof Error) as Error | undefined;
    if (directError) {
      const cloned = new Error(directError.message);
      if (directError.stack) cloned.stack = directError.stack;
      if (directError.name) cloned.name = directError.name;
      return cloned;
    }
    const stackArg = rawArgs.find(
      (a) => typeof a === "object" && a !== null && typeof (a as { stack?: unknown }).stack === "string",
    ) as { stack?: string; message?: string } | undefined;
    const e = new Error(`React hydration mismatch (#418, via ${source})`);
    if (stackArg?.stack) e.stack = stackArg.stack;
    return e;
  }

  function deliver(source: "console.error" | "window.error", payload: Record<string, unknown>, rawArgs: unknown[]) {
    payload.captureSource = source;

    // Send to Sentry first (best-effort). Round-15 retest found
    // captures reached the tunnel but never appeared in the Sentry
    // UI — root cause was that every synthetic Error has the SAME
    // message + stack frame (this file, this line), so Sentry's
    // grouping algorithm collapsed every capture across every
    // release into ONE long-lived issue, and the QA's
    // `lastSeen:-15m` searches missed updates to that old issue.
    // Setting an explicit fingerprint ties the issue to a stable
    // key we can search for directly, and capturing the returned
    // eventId lets us correlate client-side captures with Sentry
    // ingest 1:1.
    let sentryEventId: string | undefined;
    if (dsn) {
      try {
        const err = buildException(source, rawArgs);
        sentryEventId = Sentry.withScope((scope) => {
          scope.setFingerprint(["react-hydration-error", "418", source]);
          scope.setLevel("error");
          scope.setTag("hydration", "true");
          scope.setTag("captureSource", source);
          scope.setExtras(payload);
          return Sentry.captureException(err);
        });
        if (sentryEventId) {
          // Echo to console so QA can confirm SDK acceptance without
          // depending on Sentry's UI search filters. Search for
          // "[hydration-capture]" in the browser console to verify.
          // eslint-disable-next-line no-console
          console.warn(
            `[hydration-capture] Sentry accepted eventId=${sentryEventId} source=${source}`,
          );
        }
      } catch {
        // never let Sentry path crash the diagnostic
      }
    }

    // Stash the Sentry eventId in the DB-fallback payload so
    // admin_log rows correlate 1:1 with Sentry events — makes it
    // easy to confirm "saw this in admin_log → does Sentry have it?"
    // by literal eventId lookup instead of timestamp guessing.
    if (sentryEventId) payload.sentryEventId = sentryEventId;

    // Mirror to our admin_log via the dedicated capture endpoint.
    // Uses fetch with keepalive:true so the request survives a page
    // navigation that follows the error.
    try {
      fetch("/api/internal/hydration-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // fetch threw — give up silently
    }
  }

  // Path (a) — console.error wrapper.
  const originalError = window.console.error;
  window.console.error = (...args: unknown[]) => {
    try {
      // Stringify ALL args (including printf-style template + numeric
      // codes) and match against the joined message — this is what
      // QA caught: previous code only inspected args[0] which was the
      // template string `"Minified React error #%s..."` and missed
      // the actual number entirely.
      const joined = args
        .map((a) =>
          typeof a === "string"
            ? a
            : a instanceof Error
              ? a.message
              : a == null
                ? ""
                : String(a),
        )
        .join(" ");
      if (HYDRATION_PATTERN.test(joined)) {
        deliver("console.error", buildPayload(args), args);
      }
    } catch {
      // Never let our diagnostic break the original console.error
    }
    originalError.apply(window.console, args as Parameters<typeof console.error>);
  };

  // Path (b) — window.error listener for the uncaught-throw shape.
  // De-dupe with a small flag so a single mismatch that hits both
  // paths only generates one admin_log row.
  let lastSeen = 0;
  window.addEventListener("error", (event) => {
    try {
      const msg =
        (event.error && typeof event.error.message === "string" && event.error.message) ||
        (typeof event.message === "string" ? event.message : "");
      if (!HYDRATION_PATTERN.test(msg)) return;
      const now = Date.now();
      if (now - lastSeen < 1000) return; // 1s coalesce window
      lastSeen = now;
      const wrappedArgs: unknown[] = [
        event.error || event.message,
        event.filename ? `${event.filename}:${event.lineno || 0}` : null,
      ];
      deliver("window.error", buildPayload(wrappedArgs), wrappedArgs);
    } catch {
      // never let our diagnostic break the original error listener
    }
  });
}

