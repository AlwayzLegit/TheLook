import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";

export async function GET() {
  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  const { data: allStylists, error: stylistsError } = await supabase
    .from("stylists")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (stylistsError) {
    logError("stylists GET", stylistsError);
    return apiError("Failed to fetch stylists.", 500);
  }

  const { data: allMappings, error: mappingsError } = await supabase
    .from("stylist_services")
    .select("*");

  if (mappingsError) {
    logError("stylists GET (mappings)", mappingsError);
    return apiError("Failed to fetch stylist services.", 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (allStylists || []).map((s: any) => ({
    ...s,
    specialties: s.specialties ? JSON.parse(s.specialties) : [],
    serviceIds: (allMappings || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.stylist_id === s.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.service_id),
  }));

  return apiSuccess(result);
}
