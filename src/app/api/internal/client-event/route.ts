import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiSuccess, apiError, logError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

// Generic client-side diagnostic channel. Sibling to
// /api/internal/hydration-error — same safety model, but instead of a
// fixed hydration shape it accepts a small { event, detail } envelope
// and writes it to admin_log under a forced "client." action prefix.
//
// Why this exists: the activity log was complete for server actions
// and React hydration crashes, but had a blind spot on interactive
// client flows (specifically the admin New Appointment sheet submit
// path). A failed booking attempt that never issued a network request
// left zero trace anywhere. This endpoint lets those flows record
// "attempt / blocked / posting / result / exception" breadcrumbs into
// the same activity log the owner already reads, closing that gap.
//
// Safety (mirrors the hydration route):
//   - same-origin only (Origin must contain Host)
//   - 30 events / 5 min per IP
//   - 4 KB stored payload cap
//   - action is always "client.<sanitised event>" so it can never
//     collide with or forge a real audit action
//   - fail-open: diagnostics must never break the UI

const MAX_PAYLOAD_BYTES = 4 * 1024;

export async function POST(request: NextRequest) {
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
    key: `client-event:${ip}`,
    limit: 30,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.ok) return apiError("Too many events. Slow down.", 429);

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return apiError("Body required.", 400);
  }
  if (bodyText.length > MAX_PAYLOAD_BYTES) {
    bodyText = bodyText.slice(0, MAX_PAYLOAD_BYTES);
  }

  let payload: { event?: unknown; detail?: unknown };
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return apiError("Body must be JSON.", 400);
  }

  const rawEvent = typeof payload?.event === "string" ? payload.event : "";
  if (!rawEvent) return apiError("event is required.", 400);
  // Lock the action namespace. Only [a-z0-9._-], capped length, always
  // prefixed "client." — a curious same-origin caller can't forge an
  // "appointment.create" or "auth.*" row this way.
  const safeEvent = rawEvent
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 60);
  if (!safeEvent) return apiError("Invalid event.", 400);

  if (!hasSupabaseConfig) return apiSuccess({ ok: true, stored: false });

  try {
    await supabase.from("admin_log").insert({
      action: `client.${safeEvent}`,
      details: JSON.stringify({
        detail: payload?.detail ?? {},
        ua: request.headers.get("user-agent") || null,
        at: new Date().toISOString(),
      }).slice(0, MAX_PAYLOAD_BYTES),
      actor_email: null,
      actor_user_id: null,
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || null,
    });
    return apiSuccess({ ok: true, stored: true });
  } catch (err) {
    logError("client-event capture", err);
    return apiSuccess({ ok: true, stored: false });
  }
}
