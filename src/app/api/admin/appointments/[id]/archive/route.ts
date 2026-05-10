import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Soft-archive: stamps archived_at so the appointment disappears from
// active admin views and gets auto-purged after 30 days. Un-archive by
// sending { restore: true }. Only cancelled / no_show / completed bookings
// may be archived — pending / confirmed are still actionable.
const ARCHIVABLE_STATUSES = new Set(["cancelled", "no_show", "completed"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_bookings", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const restore = Boolean((body as { restore?: boolean }).restore);

  if (restore) {
    const { error } = await supabase
      .from("appointments")
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      logError("admin/appointments archive (restore)", error);
      return apiError("Failed to restore appointment.", 500);
    }
    logAdminAction("appointment.unarchive", JSON.stringify({ id }), id);
    return apiSuccess({ restored: true });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", id)
    .single();
  if (!appt) return apiError("Appointment not found.", 404);

  if (!ARCHIVABLE_STATUSES.has(appt.status as string)) {
    return apiError(
      "Only cancelled, no-show, or completed appointments can be archived.",
      400,
    );
  }

  const { error } = await supabase
    .from("appointments")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    logError("admin/appointments archive", error);
    return apiError("Failed to archive appointment.", 500);
  }
  logAdminAction("appointment.archive", JSON.stringify({ id }), id);
  return apiSuccess({ archived: true });
}
