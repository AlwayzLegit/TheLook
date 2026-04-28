import { NextRequest } from "next/server";

// Sentry tunnel — bypasses ad-blockers (Brave shields, uBlock,
// Ghostery, AdGuard, etc.) that filter `*.sentry.io` by default.
// Round-10 QA found that #418 hydration capture was working on
// our DB-fallback path but Sentry never received the events on
// browsers with default content-blocking enabled, so we couldn't
// see the symbolicated stack frames despite source maps uploading
// correctly.
//
// instrumentation-client.ts sets `tunnel: '/monitoring'` on the
// Sentry SDK, which makes the browser POST envelope payloads
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
    return new Response("Invalid envelope", { status: 400 });
  }
  if (!envelope) return new Response(null, { status: 400 });

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
    return new Response("Invalid envelope header", { status: 400 });
  }

  const requestProjectId = dsn.pathname.replace(/^\//, "");
  if (requestProjectId !== KNOWN_PROJECT_ID || dsn.host !== KNOWN_HOST) {
    // Reject envelopes targeting any Sentry project other than ours.
    return new Response("DSN mismatch", { status: 403 });
  }

  const upstream = `https://${dsn.host}/api/${KNOWN_PROJECT_ID}/envelope/`;
  try {
    const res = await fetch(upstream, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "application/x-sentry-envelope" },
    });
    // Mirror Sentry's response code on success; on upstream failure
    // return 202 so the SDK doesn't treat us as a broken tunnel and
    // start logging extra noise (we'd rather quietly drop than
    // cascade a Sentry hiccup into the user's tab).
    return new Response(null, { status: res.ok ? res.status : 202 });
  } catch {
    return new Response(null, { status: 202 });
  }
}
