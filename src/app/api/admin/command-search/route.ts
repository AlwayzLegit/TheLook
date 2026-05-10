import { auth } from "@/lib/auth";
import { requireAnyAdminAccess } from "@/lib/apiAuth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Powers the ⌘K command palette. Returns top matches from three entity
// types so the palette can render a grouped list without multiple round
// trips. Deliberately capped + column-narrow so a palette keystroke feels
// instant at 1,375+ clients.

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requireAnyAdminAccess(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess({ clients: [], appointments: [], services: [] });

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return apiSuccess({ clients: [], appointments: [], services: [] });

  const like = `%${q.replace(/[%_]/g, "")}%`;
  const digits = q.replace(/\D/g, "");
  const phoneLike = digits.length >= 3 ? `%${digits}%` : null;

  try {
    const [clientsRes, apptsRes, servicesRes] = await Promise.all([
      supabase
        .from("client_profiles")
        .select("email, name, phone, banned")
        .or([
          `name.ilike.${like}`,
          `email.ilike.${like}`,
          phoneLike ? `phone.ilike.${phoneLike}` : null,
        ].filter(Boolean).join(","))
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("appointments")
        .select("id, client_name, client_email, date, start_time, status")
        .or(`client_name.ilike.${like},client_email.ilike.${like}`)
        .order("date", { ascending: false })
        .limit(6),
      supabase
        .from("services")
        .select("id, name, category, price_text, slug")
        .eq("active", true)
        .ilike("name", like)
        .order("sort_order", { ascending: true })
        .limit(6),
    ]);

    return apiSuccess({
      clients: clientsRes.data || [],
      appointments: apptsRes.data || [],
      services: servicesRes.data || [],
    });
  } catch (err) {
    logError("admin/command-search", err);
    return apiError("Search failed.", 500);
  }
}
