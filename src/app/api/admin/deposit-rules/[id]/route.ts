import { NextRequest } from "next/server";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { depositRuleSchema } from "@/lib/validation";
import { logAdminAction } from "@/lib/auditLog";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = depositRuleSchema.partial().safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path?.join(".") || "payload";
    return apiError(`${field}: ${first?.message || "invalid"}`, 400);
  }

  const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("deposit_rules")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logError("deposit-rules PATCH", error);
    return apiError(`Failed to update rule: ${error.message}`, 500);
  }

  await logAdminAction("deposit_rule.update", JSON.stringify({ id }));
  return apiSuccess(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const { error } = await supabase.from("deposit_rules").delete().eq("id", id);
  if (error) {
    logError("deposit-rules DELETE", error);
    return apiError("Failed to delete rule.", 500);
  }
  await logAdminAction("deposit_rule.delete", JSON.stringify({ id }));
  return apiSuccess({ success: true });
}
