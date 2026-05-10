import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Discounts touch revenue — restrict to admin + manager. Stylists
// (future login role) don't get price-control surface.

export async function GET() {
  const user = await getSessionUser();
  if (!userHasPermission(user, "manage_catalog")) return apiError("You don't have access to this action.", 403);
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logError("admin/discounts GET", error);
    return apiError("Failed to fetch discounts.", 500);
  }

  return apiSuccess(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!userHasPermission(user, "manage_catalog")) return apiError("You don't have access to this action.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();

  if (!body.code || !body.type || !body.value) {
    return apiError("Code, type, and value are required.", 400);
  }

  const { data, error } = await supabase
    .from("discounts")
    .insert({
      code: body.code.toUpperCase().trim(),
      description: body.description || null,
      type: body.type,
      value: body.value,
      min_purchase: body.minPurchase || 0,
      max_uses: body.maxUses || null,
      valid_from: body.validFrom || null,
      valid_until: body.validUntil || null,
      active: body.active ?? true,
    })
    .select()
    .single();

  if (error) {
    logError("admin/discounts POST", error);
    if (error.message?.includes("unique")) {
      return apiError("A discount with this code already exists.", 409);
    }
    return apiError("Failed to create discount.", 500);
  }

  logAdminAction("discount.create", JSON.stringify({ code: body.code }));
  return apiSuccess(data, 201);
}
