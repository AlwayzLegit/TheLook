import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Activity log reader.
//   q         — free-text over action + details + actor_email
//   category  — action prefix filter: booking, service, stylist, schedule,
//               settings, user, client, other
//   actor     — filter by actor_email
//   from/to   — YYYY-MM-DD date range
//   page      — 1-indexed (default 1)
//   pageSize  — default 50, max 200

const CATEGORY_PREFIX: Record<string, string[]> = {
  booking: ["appointment."],
  service: ["service."],
  stylist: ["stylist."],
  schedule: ["schedule."],
  settings: ["settings."],
  user: ["user."],
  client: ["client.", "clients."],
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess({ total: 0, page: 1, pageSize: 50, entries: [] });

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const category = sp.get("category") || "";
  const actor = (sp.get("actor") || "").trim();
  const from = sp.get("from");
  const to = sp.get("to");
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("pageSize") || "50", 10) || 50));

  let query = supabase
    .from("admin_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q.length > 0) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`action.ilike.${like},details.ilike.${like},actor_email.ilike.${like}`);
  }

  if (category && CATEGORY_PREFIX[category]) {
    const prefixes = CATEGORY_PREFIX[category];
    // PostgREST `or` with `like.prefix%` matches prefixes. Combine with OR.
    const ors = prefixes.map((p) => `action.like.${p}%`).join(",");
    query = query.or(ors);
  } else if (category === "other") {
    // Anything that doesn't match a known prefix.
    const knownPrefixes = Object.values(CATEGORY_PREFIX).flat();
    for (const p of knownPrefixes) query = query.not("action", "like", `${p}%`);
  }

  if (actor) query = query.eq("actor_email", actor);
  if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59Z`);

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  // Retry without actor columns if the schema is behind (B-17 migration
  // not applied). Keeps the dashboard loadable on pre-migration envs.
  let { data, count, error } = await query;
  if (error && /actor_email|actor_user_id|ip_address|user_agent/i.test(error.message || "")) {
    let legacy = supabase.from("admin_log").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (q.length > 0) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      legacy = legacy.or(`action.ilike.${like},details.ilike.${like}`);
    }
    if (from) legacy = legacy.gte("created_at", `${from}T00:00:00Z`);
    if (to) legacy = legacy.lte("created_at", `${to}T23:59:59Z`);
    legacy = legacy.range((page - 1) * pageSize, page * pageSize - 1);
    ({ data, count, error } = await legacy);
  }

  if (error) {
    logError("admin/activity GET", error);
    return apiError("Failed to fetch activity log.", 500);
  }

  return apiSuccess({ total: count ?? 0, page, pageSize, entries: data || [] });
}

// Distinct actors for the filter dropdown. Cheap — there are usually < 10.
export async function OPTIONS() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess({ actors: [] });

  const { data, error } = await supabase
    .from("admin_log")
    .select("actor_email")
    .not("actor_email", "is", null)
    .limit(500);
  if (error) return apiSuccess({ actors: [] });
  const actors = Array.from(new Set((data || []).map((r: { actor_email: string | null }) => r.actor_email).filter(Boolean))) as string[];
  return apiSuccess({ actors });
}
