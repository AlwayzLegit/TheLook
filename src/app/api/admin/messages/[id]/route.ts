import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Admin updates a contact message. Body:
//   { read: true|false }    — stamps or clears read_at
//   { is_spam: true|false|null } — manual spam flag (null = use heuristic)
// Both can be sent in the same PATCH. Idempotent — sending the current
// state is a no-op.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(body, "read")) {
    update.read_at = body.read === false ? null : new Date().toISOString();
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_spam")) {
    // Accept true / false / null. Anything else ignored.
    if (body.is_spam === true || body.is_spam === false || body.is_spam === null) {
      update.is_spam = body.is_spam;
    }
  }

  if (Object.keys(update).length === 0) {
    return apiError("Nothing to update. Send { read } or { is_spam }.", 400);
  }

  const { error } = await supabase
    .from("contact_messages")
    .update(update)
    .eq("id", id);
  if (error) {
    logError("admin/messages PATCH", error);
    return apiError(`Failed to update message: ${error.message || "unknown"}`, 500);
  }
  await logAdminAction("message.update", JSON.stringify({ id, ...update }));
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
