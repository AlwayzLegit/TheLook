import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { denyMissingPermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// GET /api/admin/messages                    — full list (admin page)
// GET /api/admin/messages?unreadOnly=true    — only unread (sidebar badge)
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
    if (!user) return apiError("Unauthorized", 401);
  if (!userHasPermission(user, "manage_clients")) return denyMissingPermission(user, "manage_clients", request);
  if (!hasSupabaseConfig) return apiSuccess([]);

  const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";

  let query = supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (unreadOnly) query = query.is("read_at", null);

  let { data, error } = await query;
  // Pre-20260505 installs don't have read_at yet — the filter errors.
  // Fall back to the full list so callers don't break (they'll over-
  // count until the migration runs).
  if (error && unreadOnly && /read_at/i.test(error.message || "")) {
    const retry = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    logError("admin/messages GET", error);
    return apiError("Failed to fetch messages.", 500);
  }

  return apiSuccess(data || []);
}
