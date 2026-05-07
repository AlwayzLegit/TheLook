import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

async function requireStylist() {
  const user = await getSessionUser();
  if (!user) return { error: apiError("Unauthorized", 401) };
  if (user.role !== "stylist" || !user.stylistId) {
    return { error: apiError("Stylist access required.", 403) };
  }
  return { user };
}

// GET: service IDs assigned to the current stylist
export async function GET() {
  const { user, error } = await requireStylist();
  if (error) return error;
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { data, error: dbError } = await supabase
    .from("stylist_services")
    .select("service_id")
    .eq("stylist_id", user!.stylistId);

  if (dbError) {
    logError("my-profile/services GET", dbError);
    return apiError("Failed to load services.", 500);
  }

  return apiSuccess(((data || []) as Array<{ service_id: string }>).map((r) => r.service_id));
}

// PUT: replace the current stylist's service assignments
export async function PUT(request: NextRequest) {
  const { user, error } = await requireStylist();
  if (error) return error;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds : [];

  const { error: deleteError } = await supabase
    .from("stylist_services")
    .delete()
    .eq("stylist_id", user!.stylistId);

  if (deleteError) {
    logError("my-profile/services PUT (delete)", deleteError);
    return apiError("Failed to update services.", 500);
  }

  if (serviceIds.length > 0) {
    const rows = serviceIds.map((serviceId) => ({
      stylist_id: user!.stylistId,
      service_id: serviceId,
    }));
    const { error: insertError } = await supabase
      .from("stylist_services")
      .insert(rows);

    if (insertError) {
      logError("my-profile/services PUT (insert)", insertError);
      return apiError("Failed to update services.", 500);
    }
  }

  logAdminAction("stylist.self_services_update", JSON.stringify({ stylistId: user!.stylistId, count: serviceIds.length }));

  return apiSuccess({ success: true, count: serviceIds.length });
}
