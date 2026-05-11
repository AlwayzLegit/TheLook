import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { NextRequest } from "next/server";

// Mail health summary for /admin/errors. Aggregates the last 24 hours
// of email.*.sent / .failed / .skipped rows from admin_log so the
// operator can spot at a glance whether outbound mail is healthy —
// and which failure reason is the most common when it isn't.

interface MailHealthCounts {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  // Top failure reason (most-common "reason" across .failed + .skipped
  // rows in the window). Null when nothing has failed.
  topFailureReason: string | null;
  // Total distinct failure reasons. Helps the operator know whether
  // they're seeing one cascading outage (1 reason × N failures) or
  // multiple unrelated issues.
  distinctFailureReasons: number;
  // Window end is now; window start is end - 24h. ISO strings so the
  // UI can show absolute timestamps if it wants.
  windowStart: string;
  windowEnd: string;
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission("view_analytics", request);
  if (!gate.ok) return gate.response;

  if (!hasSupabaseConfig) {
    return apiError("Supabase not configured.", 503);
  }

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("admin_log")
    .select("action, details")
    .like("action", "email.%")
    .gte("created_at", windowStart.toISOString())
    .limit(2000);

  if (error) {
    return apiError(`Failed to load mail health: ${error.message}`, 502);
  }

  const counts: MailHealthCounts = {
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    topFailureReason: null,
    distinctFailureReasons: 0,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  };

  const reasonTally = new Map<string, number>();

  for (const row of data ?? []) {
    const action = (row as { action?: string }).action ?? "";
    counts.total += 1;
    if (action.endsWith(".sent")) {
      counts.sent += 1;
      continue;
    }
    const isFailed = action.endsWith(".failed");
    const isSkipped = action.endsWith(".skipped");
    if (!isFailed && !isSkipped) continue;
    if (isFailed) counts.failed += 1;
    else counts.skipped += 1;

    // Parse the JSON details column to bucket by failure reason. The
    // column is stored as text (not jsonb) on this project; details
    // may be undefined / non-JSON on legacy rows so guard each step.
    try {
      const raw = (row as { details?: string | null }).details;
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { reason?: string };
      const reason = parsed.reason?.trim();
      if (!reason) continue;
      reasonTally.set(reason, (reasonTally.get(reason) ?? 0) + 1);
    } catch {
      /* malformed details — ignore for the tally */
    }
  }

  if (reasonTally.size > 0) {
    let topReason: string | null = null;
    let topCount = 0;
    for (const [reason, count] of reasonTally) {
      if (count > topCount) {
        topCount = count;
        topReason = reason;
      }
    }
    counts.topFailureReason = topReason;
    counts.distinctFailureReasons = reasonTally.size;
  }

  return apiSuccess(counts);
}
