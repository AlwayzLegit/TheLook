import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Public endpoint: returns active variants for a single service. The booking
// flow uses this when a service has variants (e.g. Facial Hair Removal).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSupabaseConfig) return apiSuccess([]);
  const { id } = await params;
  const { data, error } = await supabase
    .from("service_variants")
    .select("id, service_id, name, price_text, price_min, duration, sort_order")
    .eq("service_id", id)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    logError("public variants GET", error);
    return apiError("Failed to load variants.", 500);
  }
  return apiSuccess(data || []);
}
