import { NextRequest } from "next/server";

// Force Node runtime + bound the maxDuration so a slow Sentry
// upstream can't hold a serverless invocation past Vercel Hobby's
// 10-second cap. We always return 200 to the SDK so a flaky
// upstream doesn't trigger the SDK's retry loop (which floods the
// browser network panel with /api/monitoring 5xx). Forwarding
// failures are logged via console.error so they're visible in
// Vercel logs — the round-15 silent-swallow regression came from
// an empty catch hiding upstream timeouts.
export const runtime = "nodejs";
export const maxDuration = 10;

// Sentry tunnel — bypasses ad-blockers (Brave shields, uBlock,
// Ghostery, AdGuard, etc.) that filter `*.sentry.io` by default.
// Round-10 QA found that #418 hydration capture was working on
// our DB-fallback path but Sentry never received the events on
// browsers with default content-blocking enabled, so we couldn't
// see the symbolicated stack frames despite source maps uploading
// correctly.
//
// instrumentation-client.ts sets `tunnel: '/api/monitoring'` on
// the Sentry SDK, which makes the browser POST envelope payloads
// here instead of directly to ingest.us.sentry.io. We validate
// the envelope's DSN matches our project (so we're not used as a
// free Sentry proxy for unrelated projects) and forward the body
// upstream verbatim. This is exactly the recipe documented at
// https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers

const KNOWN_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";
const KNOWN_PROJECT_ID = (() => {
  try {
    if (!KNOWN_DSN) return null;
    return new URL(KNOWN_DSN).pathname.replace(/^\//, "");
  } catch {
    return null;
  }
})();
const KNOWN_HOST = (() => {
  try {
    if (!KNOWN_DSN) return null;
    return new URL(KNOWN_DSN).host;
  } catch {
    return null;
  }
})();

export async function POST(request: NextRequest) {
  if (!KNOWN_PROJECT_ID || !KNOWN_HOST) {
    // Sentry isn't configured locally — silently accept so dev /
    // preview builds without the DSN don't surface noisy 503s in
    // the browser console on every error.
    return new Response(null, { status: 202 });
  }

  let envelope: string;
  try {
    envelope = await request.text();
  } catch {
    // Soft-accept — never let body-parse failures cascade into
    // the SDK's retry loop.
    return new Response(null, { status: 202 });
  }
  if (!envelope) return new Response(null, { status: 202 });

  // First line of every Sentry envelope is a JSON header containing
  // the originating DSN. Parse it to figure out which project this
  // payload is for.
  const headerLine = envelope.split("\n", 1)[0];
  let dsn: URL;
  try {
    const header = JSON.parse(headerLine);
    if (typeof header?.dsn !== "string") throw new Error("no dsn");
    dsn = new URL(header.dsn);
  } catch {
    // Malformed envelope — we don't want to advertise that to
    // potential probes, just accept-and-drop.
    return new Response(null, { status: 202 });
  }

  const requestProjectId = dsn.pathname.replace(/^\//, "");
  if (requestProjectId !== KNOWN_PROJECT_ID || dsn.host !== KNOWN_HOST) {
    // Reject envelopes targeting any Sentry project other than
    // ours — keeps anyone from using our endpoint as a free Sentry
    // proxy for an unrelated project.
    return new Response("DSN mismatch", { status: 403 });
  }

  const upstream = `https://${dsn.host}/api/${KNOWN_PROJECT_ID}/envelope/`;
  try {
    // No AbortSignal here — round-15 QA found the previous 4s
    // bound was tripping on slow Sentry days and silently
    // dropping every envelope (zero events landed despite 200s
    // on the tunnel). The maxDuration=10 export already caps the
    // serverless invocation, so worst case we lose a single
    // envelope at the function boundary instead of every envelope
    // that happens to take >4s upstream.
    const upstreamRes = await fetch(upstream, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "application/x-sentry-envelope" },
      cache: "no-store",
    });
    if (!upstreamRes.ok) {
      // Surface forwarding failures so they show up in Vercel
      // logs instead of vanishing into a silent always-200.
      // We still return 200 below — the SDK retries non-2xx in
      // a tight loop that floods the browser network panel —
      // this is purely for observability when Sentry rejects an
      // envelope (rate limit, disabled DSN, etc.).
      console.error(
        `[sentry-tunnel] upstream rejected envelope: ${upstreamRes.status} ${upstreamRes.statusText}`,
      );
    }
  } catch (err) {
    // Round-15 P1: empty catch was hiding the fact that envelopes
    // never reached Sentry. Log the failure so we can SEE it.
    // We still always-200 below to keep the SDK's retry loop calm.
    console.error("[sentry-tunnel] upstream forward failed:", err);
  }
  return new Response(null, { status: 200 });
}
