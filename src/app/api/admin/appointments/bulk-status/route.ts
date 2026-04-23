import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Bulk status change. Owner selects multiple appointments in the list
// and flips their status in one request — previously every row had to
// be clicked individually, which is the main end-of-day friction the
// system audit flagged. Limited to status transitions that don't have
// side-effects that need per-appointment context (e.g. emailing every
// client for a mark-as-completed is overkill and spammy).
//
// Accepted statuses: completed | no_show | cancelled
// Body:  { ids: string[], status: "completed" | "no_show" | "cancelled" }

const ALLOWED_STATUSES = new Set(["completed", "no_show", "cancelled"]);
const MAX_BATCH = 100;

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.ids) || typeof body.status !== "string") {
    return apiError("Expected { ids: string[], status: string }.", 400);
  }

  const ids: string[] = body.ids
    .filter((v: unknown) => typeof v === "string" && v.length > 0)
    .slice(0, MAX_BATCH);
  const status: string = body.status;

  if (ids.length === 0) return apiError("No appointment IDs provided.", 400);
  if (!ALLOWED_STATUSES.has(status)) {
    return apiError(`Status must be one of: ${Array.from(ALLOWED_STATUSES).join(", ")}.`, 400);
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id, status");

  if (error) {
    logError("admin/appointments bulk-status", error);
    return apiError("Bulk update failed.", 500);
  }

  await logAdminAction(
    "appointment.bulk_status",
    JSON.stringify({ status, count: data?.length ?? 0 }),
  );

  return apiSuccess({ updated: data?.length ?? 0, status });
}
