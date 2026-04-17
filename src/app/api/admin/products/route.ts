import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    logError("admin/products GET", error);
    return apiError("Failed to fetch.", 500);
  }

  return apiSuccess(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!isAdmin(user)) return apiError("Admin access required.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  if (!body.name) return apiError("Name is required.", 400);

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      brand: body.brand || null,
      category: body.category || null,
      sku: body.sku || null,
      stock_qty: body.stockQty ?? 0,
      low_stock_threshold: body.lowStockThreshold ?? 5,
      cost_price: body.costPrice ?? null,
      retail_price: body.retailPrice ?? null,
      active: body.active ?? true,
    })
    .select()
    .single();

  if (error) {
    logError("admin/products POST", error);
    return apiError("Failed to create.", 500);
  }

  logAdminAction("product.create", JSON.stringify({ name: body.name }));
  return apiSuccess(data, 201);
}
