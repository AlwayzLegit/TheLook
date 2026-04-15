import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  const { data, error } = await supabase
    .from("admin_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("admin/activity GET", error);
    return apiError("Failed to fetch activity log.", 500);
  }

  return apiSuccess(data || []);
}
