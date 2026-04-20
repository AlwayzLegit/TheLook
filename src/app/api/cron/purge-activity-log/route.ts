import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Daily cron — purges admin_log entries older than 180 days.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { data, error } = await supabase.rpc("fn_purge_old_admin_log", { retain_days: 180 });
  if (error) {
    logError("cron/purge-activity-log", error);
    return apiError("Purge failed.", 500);
  }
  return apiSuccess({ purged: typeof data === "number" ? data : 0 });
}
