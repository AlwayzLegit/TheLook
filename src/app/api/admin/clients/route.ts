import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/apiAuth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Paginated + filterable client directory. Pulls from client_profiles
// (now including imported rows with no appointments yet) and augments
// each row with visits / no-show / last-visit / total-spent stats from
// appointments.
//
// Query params:
//   q            — free-text search (name, email, phone)
//   banned       — "true" to only return banned clients
//   hasVisits    — "true" to exclude 0-visit profiles (e.g. fresh imports)
//   sort         — "recent" (default) | "visits" | "spent" | "name"
//   page         — 1-indexed (default 1)
//   pageSize     — default 50, max 200
//
// Returns { total, page, pageSize, clients: [...] }.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_clients", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess({ total: 0, page: 1, pageSize: 50, clients: [] });

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const banned = sp.get("banned") === "true";
  const hasVisits = sp.get("hasVisits") === "true";
  const sort = sp.get("sort") || "recent";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("pageSize") || "50", 10) || 50));

  let profileQ = supabase.from("client_profiles").select("*", { count: "exact" });
  if (banned) profileQ = profileQ.eq("banned", true);
  if (q.length > 0) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    profileQ = profileQ.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }

  const { data: profiles, count, error } = await profileQ
    .order("updated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    logError("admin/clients GET", error);
    return apiError("Failed to fetch clients.", 500);
  }

  const emails = (profiles || []).map((p: { email: string }) => p.email.toLowerCase());
  // Pull appointment stats for the current page's emails only — keeps the
  // aggregate query cheap regardless of how many profiles exist.
  const { data: appts } = emails.length > 0
    ? await supabase
        .from("appointments")
        .select("client_email, client_name, client_phone, status, date, service_id, stylist_id")
        .in("client_email", emails)
    : { data: [] };

  const { data: allServices } = await supabase.from("services").select("id, price_min");
  const priceById = Object.fromEntries((allServices || []).map((s: { id: string; price_min: number }) => [s.id, s.price_min]));

  const stats: Record<string, { visits: number; noShows: number; totalSpent: number; lastVisit: string; phone: string | null; name: string | null }> = {};
  type ApptStatRow = {
    client_email: string | null;
    client_name: string | null;
    client_phone: string | null;
    status: string;
    date: string | null;
    service_id: string;
    stylist_id: string;
  };
  for (const a of (appts || []) as ApptStatRow[]) {
    const key = (a.client_email || "").toLowerCase();
    if (!stats[key]) stats[key] = { visits: 0, noShows: 0, totalSpent: 0, lastVisit: "", phone: null, name: null };
    const s = stats[key];
    if (a.status === "confirmed" || a.status === "completed") {
      s.visits++;
      s.totalSpent += priceById[a.service_id] || 0;
    }
    if (a.status === "no_show") s.noShows++;
    if (a.date && a.date > s.lastVisit) {
      s.lastVisit = a.date;
      if (a.client_phone) s.phone = a.client_phone;
      if (a.client_name) s.name = a.client_name;
    }
  }

  type ProfileRow = {
    email: string;
    name: string | null;
    phone: string | null;
    birthday: string | null;
    banned: boolean | null;
    banned_reason: string | null;
    imported_at: string | null;
  };
  let clients = ((profiles || []) as ProfileRow[]).map((p) => {
    const s = stats[p.email.toLowerCase()] || { visits: 0, noShows: 0, totalSpent: 0, lastVisit: "", phone: null, name: null };
    return {
      email: p.email,
      name: s.name || p.name,
      phone: s.phone || p.phone || null,
      birthday: p.birthday || null,
      banned: Boolean(p.banned),
      bannedReason: p.banned_reason || null,
      importedAt: p.imported_at || null,
      visits: s.visits,
      noShows: s.noShows,
      totalSpent: s.totalSpent,
      lastVisit: s.lastVisit || null,
    };
  });

  if (hasVisits) clients = clients.filter((c: { visits: number }) => c.visits > 0);

  if (sort === "visits") clients.sort((a, b) => b.visits - a.visits);
  else if (sort === "spent") clients.sort((a, b) => b.totalSpent - a.totalSpent);
  else if (sort === "name") clients.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  else clients.sort((a, b) => (b.lastVisit || "").localeCompare(a.lastVisit || ""));

  return apiSuccess({ total: count ?? clients.length, page, pageSize, clients });
}
