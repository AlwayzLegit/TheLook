import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json();

  const { error } = await supabase
    .from("waitlist")
    .update({ status: body.status })
    .eq("id", id);

  if (error) {
    logError("admin/waitlist PATCH", error);
    return apiError("Failed to update.", 500);
  }

  logAdminAction("waitlist.update", JSON.stringify({ id, status: body.status }));
  return apiSuccess({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) {
    logError("admin/waitlist DELETE", error);
    return apiError("Failed to delete.", 500);
  }

  logAdminAction("waitlist.delete", JSON.stringify({ id }));
  return apiSuccess({ success: true });
}
