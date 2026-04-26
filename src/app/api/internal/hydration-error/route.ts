import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiSuccess, apiError, logError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

// Public-no-auth fallback for the React #418 hydration capture in
// sentry.client.config.ts. Sentry's transport is on every default
// adblock list — round-6 QA confirmed the captured envelopes were
// silently dropped by the agent's adblocker before they reached
// jetnine.sentry.io. This endpoint mirrors the same capture into
// admin_log so the owner can read the offending consoleArgs via
// SQL (or via the /admin/errors page once we surface this action
// type) without depending on Sentry being reachable from the
// reporter's browser.
//
// Why this is OK to leave unauthenticated:
//   - It only accepts a fixed-shape diagnostic payload.
//   - All writes land in admin_log with action="client.hydration_mismatch"
//     so they're isolated from real audit data.
//   - We rate-limit per IP at 10 captures / 5 min — a hostile client
//     could fill the table otherwise.
//   - We hard-cap stored payload size at 8 KB so a malicious POST
//     can't spam huge rows.
//
// Same-origin-only is enforced by checking the Origin header against
// the request URL — no cross-site can spam this endpoint.

const MAX_PAYLOAD_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  // Same-origin guard. Browsers always set Origin on POST from a
  // page, so missing-Origin = scripted / curl request and we drop.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || !origin.includes(host)) {
    return apiError("Same-origin only.", 403);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rl = await checkRateLimit({
    key: `hydration-mismatch:${ip}`,
    limit: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.ok) return apiError("Too many captures. Slow down.", 429);

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return apiError("Body required.", 400);
  }
  if (bodyText.length > MAX_PAYLOAD_BYTES) {
    bodyText = bodyText.slice(0, MAX_PAYLOAD_BYTES);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return apiError("Body must be JSON.", 400);
  }

  // Light shape validation — keeps a curious same-origin caller from
  // polluting the audit feed with arbitrary data. We don't insist on
  // every field (the client may not always have all of them) but
  // require AT LEAST one of the diagnostic-shaped keys.
  const looksHydration =
    typeof payload === "object" &&
    payload !== null &&
    (Array.isArray((payload as { consoleArgs?: unknown }).consoleArgs) ||
      typeof (payload as { stack?: unknown }).stack === "string" ||
      typeof (payload as { url?: unknown }).url === "string");
  if (!looksHydration) {
    return apiError("Payload must include consoleArgs, stack, or url.", 400);
  }

  if (!hasSupabaseConfig) return apiSuccess({ ok: true, stored: false });

  try {
    await supabase.from("admin_log").insert({
      action: "client.hydration_mismatch",
      details: JSON.stringify(payload),
      actor_email: null,
      actor_user_id: null,
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || null,
    });
    return apiSuccess({ ok: true, stored: true });
  } catch (err) {
    logError("hydration-error capture", err);
    // Fail open — diagnostic capture should never break the page,
    // and the Sentry path will still try independently.
    return apiSuccess({ ok: true, stored: false });
  }
}
