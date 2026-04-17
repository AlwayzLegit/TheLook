import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!isAdmin(user)) return apiError("Admin access required.", 403);
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { data, error } = await supabase
    .from("stylist_commissions")
    .select("*, stylists(id, name)");

  if (error) {
    logError("admin/commissions GET", error);
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
  if (!body.stylistId || body.commissionPercent === undefined) {
    return apiError("stylistId and commissionPercent required.", 400);
  }

  // Upsert
  const { data: existing } = await supabase
    .from("stylist_commissions")
    .select("id")
    .eq("stylist_id", body.stylistId)
    .single();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("stylist_commissions")
      .update({
        commission_percent: body.commissionPercent,
        hourly_rate: body.hourlyRate ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("stylist_id", body.stylistId));
  } else {
    ({ error } = await supabase
      .from("stylist_commissions")
      .insert({
        stylist_id: body.stylistId,
        commission_percent: body.commissionPercent,
        hourly_rate: body.hourlyRate ?? null,
      }));
  }

  if (error) {
    logError("admin/commissions POST", error);
    return apiError("Failed to save.", 500);
  }

  logAdminAction("commission.update", JSON.stringify({ stylistId: body.stylistId, percent: body.commissionPercent }));
  return apiSuccess({ success: true });
}
