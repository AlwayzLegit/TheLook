import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";

export async function GET() {
  if (!hasSupabaseConfig) {
    return apiSuccess({});
  }

  const { data: allServices, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    logError("services GET", error);
    return apiError("Failed to fetch services.", 500);
  }

  // Group by category
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped: Record<string, any[]> = {};
  for (const s of allServices || []) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return apiSuccess(grouped);
}
