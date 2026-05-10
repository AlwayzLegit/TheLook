import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!userHasPermission(user, "manage_catalog")) return apiError("You don't have access to this action.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("discounts")
    .update({
      description: body.description,
      type: body.type,
      value: body.value,
      min_purchase: body.minPurchase ?? 0,
      max_uses: body.maxUses ?? null,
      valid_from: body.validFrom ?? null,
      valid_until: body.validUntil ?? null,
      active: body.active,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logError("admin/discounts PATCH", error);
    return apiError("Failed to update discount.", 500);
  }

  logAdminAction("discount.update", JSON.stringify({ id, code: data?.code }));
  return apiSuccess(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!userHasPermission(user, "manage_catalog")) return apiError("You don't have access to this action.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const { error } = await supabase.from("discounts").delete().eq("id", id);

  if (error) {
    logError("admin/discounts DELETE", error);
    return apiError("Failed to delete discount.", 500);
  }

  logAdminAction("discount.delete", JSON.stringify({ id }));
  return apiSuccess({ success: true });
}
