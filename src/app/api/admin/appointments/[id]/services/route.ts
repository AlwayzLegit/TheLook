import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { denyMissingPermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Returns the snapshotted services for a single appointment so the
// admin actions modal can compute a total-duration helper line + auto-
// adjust end_time when start_time changes. Pulls duration from
// appointment_services (snapshotted at booking time) so historical
// edits to the services table don't shift a customer's calendar slot
// after the fact.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
    if (!user) return apiError("Unauthorized", 401);
  if (!userHasPermission(user, "manage_bookings")) return denyMissingPermission(user, "manage_bookings", _request);
  if (!hasSupabaseConfig) return apiSuccess({ services: [] });

  const { id } = await params;
  if (!id) return apiError("Appointment id required.", 400);

  const { data, error } = await supabase
    .from("appointment_services")
    .select("service_id, duration, price_min, sort_order")
    .eq("appointment_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    logError("admin/appointments/[id]/services GET", error);
    return apiError("Failed to load appointment services.", 500);
  }

  return apiSuccess({ services: data || [] });
}
