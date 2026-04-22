import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { todayISOInLA } from "@/lib/datetime";

// Dashboard rollup — everything the admin homepage needs in a single
// round trip. Heavy-lifting happens server-side so the browser renders
// instantly on zero-day data.
//
// Returns:
//   today: { revenue, appointments, confirmed, pending, sparkline[] }
//   trend: { revenueWeek, revenueWeekPrev, revenueMonth, revenueMonthPrev,
//            apptsWeek, apptsWeekPrev, apptsMonth, apptsMonthPrev,
//            sparkRevenue[], sparkAppts[] }
//   timeline: [{ id, clientName, serviceName, stylistId, stylistName,
//                stylistColor, start, end, status }]
//   workload: [{ stylistId, name, color, hoursToday, apptsToday,
//                revenueToday, revenueWeek }]
//   attention: { pending, unreadMessages, waitlist, lowInventory }
//   health: { noShows, cancellations, cancelRate }

const DAY_MS = 86_400_000;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess(emptyPayload());

  const today = todayISOInLA();
  const todayDate = new Date(`${today}T12:00:00`);
  const weekStart = startOfWeek(todayDate);
  const monthStart = startOfMonth(todayDate);
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd   = addDays(weekStart, -1);
  const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0);
  const trendStart = addDays(todayDate, -30); // widest window we need for sparklines
  const trendEnd   = addDays(todayDate, 14);  // timeline + upcoming

  try {
    // Fetch once — trim in memory. Hidden rows (archived / test) are already
    // handled by the normal admin appointments reads, but the dashboard
    // needs a direct DB pull for date efficiency.
    let { data: rows, error } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, client_phone, service_id, stylist_id, date, start_time, end_time, status, requested_stylist, is_test, archived_at")
      .gte("date", isoDay(trendStart))
      .lte("date", isoDay(trendEnd))
      .eq("is_test", false)
      .is("archived_at", null)
      .order("date", { ascending: true });
    // Schema fall-back — same pattern as /api/admin/appointments.
    if (error && /is_test|archived_at/i.test(error.message || "")) {
      const retry = await supabase
        .from("appointments")
        .select("id, client_name, client_email, client_phone, service_id, stylist_id, date, start_time, end_time, status, requested_stylist")
        .gte("date", isoDay(trendStart))
        .lte("date", isoDay(trendEnd));
      rows = retry.data || [];
      error = retry.error;
    }
    if (error) {
      logError("admin/dashboard", error);
      return apiError("Failed to load dashboard.", 500);
    }

    type Row = {
      id: string;
      client_name: string;
      service_id: string;
      stylist_id: string;
      date: string;
      start_time: string;
      end_time: string;
      status: string;
      requested_stylist?: boolean;
    };
    const allRows = (rows || []) as Row[];
    const apptIds = allRows.map((a) => a.id);
    const [servicesRes, stylistsRes, mappingsRes, messagesRes, waitlistRes, productsRes] = await Promise.all([
      supabase.from("services").select("id, name, price_min, duration"),
      supabase.from("stylists").select("id, name, color, active, sort_order"),
      apptIds.length > 0
        ? supabase.from("appointment_services").select("appointment_id, service_id").in("appointment_id", apptIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("contact_messages").select("id"),
      supabase.from("waitlist").select("id, status").eq("status", "waiting"),
      supabase.from("products").select("id, stock_qty, low_stock_threshold, active").eq("active", true),
    ]);

    type ServiceRow = { id: string; name: string; price_min: number; duration: number };
    type StylistRow = { id: string; name: string; color: string | null; active: boolean; sort_order: number };
    const services = (servicesRes.data || []) as ServiceRow[];
    const stylists = ((stylistsRes.data || []) as StylistRow[]).filter((s) => s.active !== false);
    const mappings = (mappingsRes.data || []) as Array<{ appointment_id: string; service_id: string }>;
    const messageCount = (messagesRes.data || []).length;
    const waitlistCount = (waitlistRes.data || []).length;
    const lowInventoryCount = (productsRes.data || []).filter(
      (p: { stock_qty: number | null; low_stock_threshold: number | null }) =>
        (p.stock_qty ?? 0) <= (p.low_stock_threshold ?? 0),
    ).length;

    const svcById = new Map<string, ServiceRow>(services.map((s) => [s.id, s]));
    const stylistById = new Map<string, StylistRow>(stylists.map((s) => [s.id, s]));
    const idsByAppt = new Map<string, string[]>();
    for (const m of mappings) {
      const arr = idsByAppt.get(m.appointment_id) || [];
      arr.push(m.service_id);
      idsByAppt.set(m.appointment_id, arr);
    }

    // Compute price + duration per appointment using the variant-free
    // baseline (variant pricing is a Phase 2 concern — the dashboard only
    // needs directional revenue).
    type Shaped = {
      id: string;
      date: string;
      start: string;
      end: string;
      status: string;
      clientName: string;
      stylistId: string | null;
      stylistName: string;
      stylistColor: string | null;
      serviceName: string;
      priceMin: number;
      requested: boolean;
    };
    const shaped: Shaped[] = allRows.map((r) => {
      const serviceIds = idsByAppt.get(r.id) || (r.service_id ? [r.service_id] : []);
      const serviceNames = serviceIds.map((id) => svcById.get(id)?.name).filter(Boolean);
      const priceMin = serviceIds.reduce((sum: number, id: string) => sum + (svcById.get(id)?.price_min || 0), 0);
      const stylist = stylistById.get(r.stylist_id);
      return {
        id: r.id,
        date: r.date,
        start: r.start_time,
        end: r.end_time,
        status: r.status,
        clientName: r.client_name,
        stylistId: r.stylist_id,
        stylistName: (stylist?.name as string) || "Stylist",
        stylistColor: (stylist?.color as string | undefined) ?? null,
        serviceName: serviceNames.join(", ") || svcById.get(r.service_id)?.name || "Service",
        priceMin,
        requested: r.requested_stylist !== false,
      };
    });

    const billable = (a: Shaped) => a.status === "confirmed" || a.status === "completed";

    // Today
    const todays = shaped.filter((a) => a.date === today).sort((a, b) => a.start.localeCompare(b.start));
    const revenueToday = todays.filter(billable).reduce((s, a) => s + a.priceMin, 0);
    const confirmedToday = todays.filter((a) => a.status === "confirmed").length;
    const pendingToday = todays.filter((a) => a.status === "pending").length;
    const pendingTotal = shaped.filter((a) => a.status === "pending").length;

    // 14-day revenue + appt sparklines so we can show the last 7 and still
    // delta vs the week before.
    const sparkRevenue: Array<{ d: string; v: number }> = [];
    const sparkAppts:   Array<{ d: string; v: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const day = isoDay(addDays(todayDate, -i));
      const dayRows = shaped.filter((a) => a.date === day);
      sparkRevenue.push({ d: day, v: dayRows.filter(billable).reduce((s, a) => s + a.priceMin, 0) });
      sparkAppts.push({ d: day, v: dayRows.filter((a) => a.status !== "cancelled" && a.status !== "no_show").length });
    }

    // Week / month totals + prior period for delta%.
    const inRange = (a: Shaped, from: Date, to: Date) => {
      return a.date >= isoDay(from) && a.date <= isoDay(to);
    };
    const revenueWeek      = shaped.filter((a) => billable(a) && inRange(a, weekStart, todayDate)).reduce((s, a) => s + a.priceMin, 0);
    const revenueWeekPrev  = shaped.filter((a) => billable(a) && inRange(a, prevWeekStart, prevWeekEnd)).reduce((s, a) => s + a.priceMin, 0);
    const revenueMonth     = shaped.filter((a) => billable(a) && inRange(a, monthStart, todayDate)).reduce((s, a) => s + a.priceMin, 0);
    const revenueMonthPrev = shaped.filter((a) => billable(a) && inRange(a, prevMonthStart, prevMonthEnd)).reduce((s, a) => s + a.priceMin, 0);

    const apptsWeek      = shaped.filter((a) => a.status !== "cancelled" && a.status !== "no_show" && inRange(a, weekStart, todayDate)).length;
    const apptsWeekPrev  = shaped.filter((a) => a.status !== "cancelled" && a.status !== "no_show" && inRange(a, prevWeekStart, prevWeekEnd)).length;
    const apptsMonth     = shaped.filter((a) => a.status !== "cancelled" && a.status !== "no_show" && inRange(a, monthStart, todayDate)).length;
    const apptsMonthPrev = shaped.filter((a) => a.status !== "cancelled" && a.status !== "no_show" && inRange(a, prevMonthStart, prevMonthEnd)).length;

    // Health (this week)
    const weekAppts = shaped.filter((a) => inRange(a, weekStart, todayDate));
    const noShows = weekAppts.filter((a) => a.status === "no_show").length;
    const cancellations = weekAppts.filter((a) => a.status === "cancelled").length;
    const cancelRate = weekAppts.length > 0 ? Math.round(((noShows + cancellations) / weekAppts.length) * 100) : 0;

    // Stylist workload today + revenue this week — ordered by sort_order so
    // the visual stays stable across polls.
    const workload = stylists
      .filter((s) => (s.name || "").trim().toLowerCase() !== "any stylist")
      .map((s) => {
        const todayForStylist = todays.filter((a) => a.stylistId === s.id);
        const totalMins = todayForStylist.reduce((sum, a) => {
          const [h1, m1] = a.start.split(":").map(Number);
          const [h2, m2] = a.end.split(":").map(Number);
          return sum + (h2 * 60 + m2) - (h1 * 60 + m1);
        }, 0);
        const revenueWeekForStylist = shaped
          .filter((a) => a.stylistId === s.id && billable(a) && inRange(a, weekStart, todayDate))
          .reduce((sum, a) => sum + a.priceMin, 0);
        return {
          stylistId: s.id,
          name: s.name,
          color: (s.color as string | undefined) ?? null,
          hoursToday: Math.round((totalMins / 60) * 10) / 10,
          apptsToday: todayForStylist.length,
          revenueToday: todayForStylist.filter(billable).reduce((sum, a) => sum + a.priceMin, 0),
          revenueWeek: revenueWeekForStylist,
        };
      });

    // Timeline — today only, keep status + colour so the client can render
    // a colour-per-stylist strip.
    const timeline = todays.map((a) => ({
      id: a.id,
      clientName: a.clientName,
      serviceName: a.serviceName,
      stylistId: a.stylistId,
      stylistName: a.stylistName,
      stylistColor: a.stylistColor,
      start: a.start,
      end: a.end,
      status: a.status,
      requested: a.requested,
    }));

    return apiSuccess({
      today: {
        date: today,
        revenue: revenueToday,
        appointments: todays.length,
        confirmed: confirmedToday,
        pending: pendingToday,
        sparkline: sparkRevenue.slice(-7).map((p) => p.v),
      },
      trend: {
        revenueWeek,
        revenueWeekPrev,
        revenueMonth,
        revenueMonthPrev,
        apptsWeek,
        apptsWeekPrev,
        apptsMonth,
        apptsMonthPrev,
        sparkRevenue: sparkRevenue.slice(-7).map((p) => p.v),
        sparkAppts:   sparkAppts.slice(-7).map((p) => p.v),
      },
      timeline,
      workload,
      attention: {
        pending: pendingTotal,
        unreadMessages: messageCount,
        waitlist: waitlistCount,
        lowInventory: lowInventoryCount,
      },
      health: { noShows, cancellations, cancelRate, totalWeek: weekAppts.length },
    });
  } catch (err) {
    logError("admin/dashboard", err);
    return apiError("Failed to load dashboard.", 500);
  }
}

function emptyPayload() {
  return {
    today: { date: "", revenue: 0, appointments: 0, confirmed: 0, pending: 0, sparkline: [] },
    trend: { revenueWeek: 0, revenueWeekPrev: 0, revenueMonth: 0, revenueMonthPrev: 0, apptsWeek: 0, apptsWeekPrev: 0, apptsMonth: 0, apptsMonthPrev: 0, sparkRevenue: [], sparkAppts: [] },
    timeline: [],
    workload: [],
    attention: { pending: 0, unreadMessages: 0, waitlist: 0, lowInventory: 0 },
    health: { noShows: 0, cancellations: 0, cancelRate: 0, totalWeek: 0 },
  };
}
