import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// GET: list service IDs assigned to this stylist
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { id } = await params;

  const { data, error } = await supabase
    .from("stylist_services")
    .select("service_id")
    .eq("stylist_id", id);

  if (error) {
    logError("admin/stylists/services GET", error);
    return apiError("Failed to fetch stylist services.", 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceIds = (data || []).map((r: any) => r.service_id);
  return apiSuccess(serviceIds);
}

// PUT: replace all service assignments for this stylist
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!isAdmin(await getSessionUser())) return apiError("Admin access required.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json();
  const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds : [];

  // Delete existing mappings
  const { error: deleteError } = await supabase
    .from("stylist_services")
    .delete()
    .eq("stylist_id", id);

  if (deleteError) {
    logError("admin/stylists/services PUT (delete)", deleteError);
    return apiError("Failed to update stylist services.", 500);
  }

  // Insert new mappings
  if (serviceIds.length > 0) {
    const rows = serviceIds.map((serviceId) => ({
      stylist_id: id,
      service_id: serviceId,
    }));

    const { error: insertError } = await supabase
      .from("stylist_services")
      .insert(rows);

    if (insertError) {
      logError("admin/stylists/services PUT (insert)", insertError);
      return apiError("Failed to update stylist services.", 500);
    }
  }

  logAdminAction("stylist.services_update", JSON.stringify({ stylistId: id, count: serviceIds.length }));

  return apiSuccess({ success: true, count: serviceIds.length });
}
