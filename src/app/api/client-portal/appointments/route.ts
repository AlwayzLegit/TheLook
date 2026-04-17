import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig) return apiSuccess([]);

  const email = request.cookies.get("thelook_client_session")?.value;
  if (!email) return apiError("Not signed in.", 401);

  const { data, error } = await supabase
    .from("appointments")
    .select("*, services(name, price_min), stylists(name)")
    .eq("client_email", email)
    .order("date", { ascending: false })
    .limit(50);

  if (error) {
    logError("client-portal/appointments GET", error);
    return apiError("Failed to fetch.", 500);
  }

  return apiSuccess(data || []);
}
