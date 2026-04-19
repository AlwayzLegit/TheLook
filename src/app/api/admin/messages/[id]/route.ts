import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) {
    logError("admin/messages DELETE", error);
    return apiError(`Failed to delete message: ${error.message || "unknown"}`, 500);
  }
  await logAdminAction("message.delete", JSON.stringify({ id }));
  return apiSuccess({ ok: true });
}
