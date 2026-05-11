import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { denyMissingPermission } from "@/lib/apiAuth";
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

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.brand !== undefined) updateData.brand = body.brand;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.sku !== undefined) updateData.sku = body.sku;
  if (body.stockQty !== undefined) updateData.stock_qty = body.stockQty;
  if (body.lowStockThreshold !== undefined) updateData.low_stock_threshold = body.lowStockThreshold;
  if (body.costPrice !== undefined) updateData.cost_price = body.costPrice;
  if (body.retailPrice !== undefined) updateData.retail_price = body.retailPrice;
  if (body.active !== undefined) updateData.active = body.active;

  const { error } = await supabase.from("products").update(updateData).eq("id", id);
  if (error) {
    logError("admin/products PATCH", error);
    return apiError("Failed to update.", 500);
  }
  logAdminAction("product.update", JSON.stringify({ id }));
  return apiSuccess({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!userHasPermission(user, "manage_catalog")) return denyMissingPermission(user, "manage_catalog", _request);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    logError("admin/products DELETE", error);
    return apiError("Failed to delete.", 500);
  }
  logAdminAction("product.delete", JSON.stringify({ id }));
  return apiSuccess({ success: true });
}
