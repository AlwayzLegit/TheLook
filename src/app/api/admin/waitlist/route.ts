import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess([]);

  let query = supabase
    .from("waitlist")
    .select("*, services(name), stylists(name)")
    .eq("status", "waiting")
    .order("created_at", { ascending: true });

  // Stylists only see waitlist entries assigned to them or unassigned
  if (user.role === "stylist" && user.stylistId) {
    query = query.or(`stylist_id.eq.${user.stylistId},stylist_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    logError("admin/waitlist GET", error);
    return apiError("Failed to fetch waitlist.", 500);
  }

  return apiSuccess(data || []);
}
