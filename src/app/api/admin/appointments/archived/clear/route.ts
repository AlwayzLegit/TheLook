import { NextRequest } from "next/server";
import { z } from "zod";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";

// Replaces the retired purge-archived cron. Deletes appointments whose
// archived_at falls in the requested window (presets 30/60/90d back, or
// custom from/to). Appointment_services rows cascade. The clear itself
// is audit-logged but no appointment rows are ever touched that haven't
// been archived first.

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
  if (!user || !isAdminOrManager(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(`${first.path.join(".")}: ${first.message}`, 400);
  }
  const p = parsed.data;

  const days = presetDays(p.preset) ?? p.days ?? null;
  // Only archived rows are deletable here.
  let query = supabase.from("appointments").delete({ count: "exact" }).not("archived_at", "is", null);

  if (days != null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    query = query.lt("archived_at", cutoff.toISOString());
  } else if (p.from || p.to) {
    if (p.from) query = query.gte("archived_at", `${p.from}T00:00:00Z`);
    if (p.to) query = query.lte("archived_at", `${p.to}T23:59:59Z`);
  } else {
    return apiError("Specify a preset, days, or from/to range.", 400);
  }

  const { count, error } = await query;
  if (error) {
    logError("appointments/archived/clear", error);
    return apiError(`Failed to clear archived appointments: ${error.message}`, 500);
  }

  await logAdminAction(
    "appointments.archived_cleared",
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
