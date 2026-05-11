import { NextRequest } from "next/server";
import { z } from "zod";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { denyMissingPermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";

// Manual replacement for the retired purge-activity-log cron. The admin
// can wipe audit rows older than N days (or in a specific date range)
// from /admin/activity. We write one "admin_log.cleared" entry AFTER the
// delete so the clear itself has an audit trail that isn't itself wiped.

const schema = z.object({
  preset: z.enum(["30", "60", "90", "custom"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.number().int().min(1).max(3650).optional(),
});

function presetDays(preset: string | undefined): number | null {
  if (preset === "30") return 30;
  if (preset === "60") return 60;
  if (preset === "90") return 90;
  return null;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
    if (!user) return apiError("Unauthorized", 401);
  if (!userHasPermission(user, "view_analytics")) return denyMissingPermission(user, "view_analytics", request);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(`${first.path.join(".")}: ${first.message}`, 400);
  }
  const p = parsed.data;

  const days = presetDays(p.preset) ?? p.days ?? null;
  let query = supabase.from("admin_log").delete({ count: "exact" });

  if (days != null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    query = query.lt("created_at", cutoff.toISOString());
  } else if (p.from || p.to) {
    if (p.from) query = query.gte("created_at", `${p.from}T00:00:00Z`);
    if (p.to) query = query.lte("created_at", `${p.to}T23:59:59Z`);
  } else {
    return apiError("Specify a preset, days, or from/to range.", 400);
  }

  const { count, error } = await query;
  if (error) {
    logError("activity-log/clear", error);
    return apiError(`Failed to clear activity log: ${error.message}`, 500);
  }

  await logAdminAction(
    "admin_log.cleared",
    JSON.stringify({
      preset: p.preset ?? null,
      days,
      from: p.from ?? null,
      to: p.to ?? null,
      removed: count ?? 0,
    }),
  );

  return apiSuccess({ removed: count ?? 0 });
}
