// Next.js 15 instrumentation hook — runs once per server startup, loads
// the right Sentry config for the runtime we're on. Required since
// Next.js 13.4 to wire Sentry without the legacy _app.tsx.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Re-export Sentry's captureRequestError so Next.js can pipe
// server-component / route-handler errors through it automatically.
// No-ops cleanly when Sentry isn't initialised (DSN missing).
export { captureRequestError as onRequestError } from "@sentry/nextjs";
