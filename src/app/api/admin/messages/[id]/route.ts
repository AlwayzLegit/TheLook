import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Admin marks a contact message as read. Body: { read: true } flips
// read_at to now(); { read: false } clears it (lets a staffer unmark
// if they want the notification back). Idempotent — no-op if the
// state is already what they asked for.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const markRead = body?.read !== false; // default true

  const { error } = await supabase
    .from("contact_messages")
    .update({ read_at: markRead ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    logError("admin/messages PATCH", error);
    return apiError(`Failed to update message: ${error.message || "unknown"}`, 500);
  }
  return apiSuccess({ ok: true });
}

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
