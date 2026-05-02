import { NextRequest } from "next/server";

// Force Node runtime + bound the maxDuration so a slow Sentry
// upstream can't hold a serverless invocation past Vercel Hobby's
// 10-second cap. Round-14 QA caught the SDK seeing 503s here even
// though the route handler reportedly returned 200 in Vercel's
// logs — most plausible cause is the upstream `fetch` blocking
// the response stream until the edge timed out and returned a 503
// to the client. We now bound the upstream call to 4s and ALWAYS
// return a 200 — the Sentry SDK only retries non-2xx, and we'd
// rather drop a single envelope than amplify a Sentry hiccup
// into a flood of client-side retries.
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
    // Bound the upstream call so a slow Sentry never holds our
    // edge invocation past the function timeout. 4s is generous —
    // Sentry's SLA is well under 1s on a healthy day. Fire-and-
    // forget, we don't act on the response code.
    await fetch(upstream, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "application/x-sentry-envelope" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
  } catch {
    // Swallow upstream errors — round-14 QA caught the SDK
    // re-trying its envelope on every non-2xx, which on a flaky
    // upstream produces a flood of /api/monitoring 5xx visible
    // in the browser network panel. By always returning 200
    // below we decouple our response from upstream's fate.
  }
  return new Response(null, { status: 200 });
}
