import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Daily cron — purges archived appointments older than 30 days. Lazy purge
// in /api/admin/appointments still runs as a safety net, but moving the
// authoritative call here means the admin list GET no longer pays the
// purge cost on every request.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { data, error } = await supabase.rpc("fn_purge_archived_appointments");
  if (error) {
    logError("cron/purge-archived", error);
    return apiError("Purge failed.", 500);
  }
  return apiSuccess({ purged: typeof data === "number" ? data : 0 });
}
