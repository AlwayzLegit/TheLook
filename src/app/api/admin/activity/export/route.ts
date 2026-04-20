import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// CSV export of the activity log. Respects the same filters as the JSON
// list endpoint so admins can download exactly what they see on screen.

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CATEGORY_PREFIX: Record<string, string[]> = {
  booking: ["appointment."],
  service: ["service."],
  stylist: ["stylist."],
  schedule: ["schedule."],
  settings: ["settings."],
  user: ["user."],
  client: ["client.", "clients."],
  auth: ["auth."],
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const category = sp.get("category") || "";
  const actor = (sp.get("actor") || "").trim();
  const from = sp.get("from");
  const to = sp.get("to");

  let query = supabase
    .from("admin_log")
    .select("created_at, action, details, actor_email, ip_address, user_agent, appointment_id")
    .order("created_at", { ascending: false })
    .limit(10_000); // safety cap

  if (q.length > 0) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`action.ilike.${like},details.ilike.${like},actor_email.ilike.${like}`);
  }
  if (category && CATEGORY_PREFIX[category]) {
    const ors = CATEGORY_PREFIX[category].map((p) => `action.like.${p}%`).join(",");
    query = query.or(ors);
  } else if (category === "other") {
    const knownPrefixes = Object.values(CATEGORY_PREFIX).flat();
    for (const p of knownPrefixes) query = query.not("action", "like", `${p}%`);
  }
  if (actor) query = query.eq("actor_email", actor);
  if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59Z`);

  const { data, error } = await query;
  if (error) {
    logError("admin/activity/export GET", error);
    return apiError("Export failed.", 500);
  }

  const header = ["When (UTC)", "Action", "Actor email", "IP", "User agent", "Appointment id", "Details"];
  const rows: string[] = [header.map(csvEscape).join(",")];
  for (const r of (data || []) as Array<Record<string, unknown>>) {
    rows.push(
      [
        csvEscape(r.created_at),
        csvEscape(r.action),
        csvEscape(r.actor_email),
        csvEscape(r.ip_address),
        csvEscape(r.user_agent),
        csvEscape(r.appointment_id),
        csvEscape(r.details),
      ].join(","),
    );
  }

  const stamp = new Date().toISOString().split("T")[0];
  return new Response(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-log-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
