import { auth } from "@/lib/auth";
import { requireAnyAdminAccess } from "@/lib/apiAuth";
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
  const gate = await requireAnyAdminAccess();
  if (!gate.ok) return gate.response;
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
    // Fetch once — trim in memory. Archived rows are always hidden from
    // the dashboard so purge-safe bookings don't polute today's counts.
    let { data: rows, error } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, client_phone, service_id, stylist_id, date, start_time, end_time, status, requested_stylist, archived_at")
      .gte("date", isoDay(trendStart))
      .lte("date", isoDay(trendEnd))
      .is("archived_at", null)
      .order("date", { ascending: true });
    if (error && /archived_at/i.test(error.message || "")) {
      const retry = await supabase
        .from("appointments")
        .select("id, client_name, client_email, client_phone, service_id, stylist_id, date, start_time, end_time, status, requested_stylist")
        .gte("date", isoDay(trendStart))
        .lte("date", isoDay(trendEnd));
      // Pre-archived_at column installs don't return the field — synthesize
      // it as null so the rest of this handler can keep its uniform Row shape.
      rows = (retry.data || []).map((r) => ({ ...r, archived_at: null }));
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
    // Pending counts run against the FULL table (no date range) so a
    // pending booking older than the 30-day trend window still counts.
    // Cheap: one row per pending appointment, no joins.
    const pendingAllP = supabase
      .from("appointments")
      .select("id, date")
      .eq("status", "pending")
      .is("archived_at", null);

    const [servicesRes, stylistsRes, mappingsRes, messagesRes, waitlistRes, productsRes, pendingAllRes] = await Promise.all([
      supabase.from("services").select("id, name, price_min, duration"),
      supabase.from("stylists").select("id, name, color, active, sort_order"),
      apptIds.length > 0
        ? supabase.from("appointment_services").select("appointment_id, service_id, price_min, duration").in("appointment_id", apptIds)
        : Promise.resolve({ data: [], error: null }),
      // Unread inbox: read_at IS NULL + not manually flagged as spam. Matches
      // how /admin/messages and the sidebar badge count "unread". Older envs
      // may not have read_at or is_spam yet — we fall back below.
      supabase
        .from("contact_messages")
        .select("id, read_at, is_spam")
        .is("read_at", null)
        .not("is_spam", "is", true),
      supabase.from("waitlist").select("id, status").eq("status", "waiting"),
      supabase.from("products").select("id, stock_qty, low_stock_threshold, active").eq("active", true),
      pendingAllP,
    ]);

    type ServiceRow = { id: string; name: string; price_min: number; duration: number };
    type StylistRow = { id: string; name: string; color: string | null; active: boolean; sort_order: number };
    const services = (servicesRes.data || []) as ServiceRow[];
    const stylists = ((stylistsRes.data || []) as StylistRow[]).filter((s) => s.active !== false);
    // price_min / duration on each mapping are the booking-time snapshot;
    // null for pre-snapshot rows, in which case we fall back to the
    // current services row.
    const mappings = (mappingsRes.data || []) as Array<{
      appointment_id: string;
      service_id: string;
      price_min: number | null;
      duration: number | null;
    }>;
    // If read_at / is_spam columns don't exist yet (pre-migration envs),
    // the strict query errors — fall back to a plain count so the widget
    // stays populated even when we can't distinguish unread from read.
    let messageCount = (messagesRes.data || []).length;
    if (messagesRes.error && /read_at|is_spam/i.test(messagesRes.error.message || "")) {
      const fallback = await supabase.from("contact_messages").select("id");
      messageCount = (fallback.data || []).length;
    }
    const waitlistCount = (waitlistRes.data || []).length;
    const lowInventoryCount = (productsRes.data || []).filter(
      (p: { stock_qty: number | null; low_stock_threshold: number | null }) =>
        (p.stock_qty ?? 0) <= (p.low_stock_threshold ?? 0),
    ).length;

    const svcById = new Map<string, ServiceRow>(services.map((s) => [s.id, s]));
    const stylistById = new Map<string, StylistRow>(stylists.map((s) => [s.id, s]));
    // Group mappings per appointment — we need both the service_id list
    // (for name display) and the per-line snapshot pricing (for revenue).
    type SnapLine = { service_id: string; price_min: number | null; duration: number | null };
    const linesByAppt = new Map<string, SnapLine[]>();
    for (const m of mappings) {
      const arr = linesByAppt.get(m.appointment_id) || [];
      arr.push({ service_id: m.service_id, price_min: m.price_min, duration: m.duration });
      linesByAppt.set(m.appointment_id, arr);
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
      const lines = linesByAppt.get(r.id) || (r.service_id ? [{ service_id: r.service_id, price_min: null, duration: null }] : []);
      const serviceIds = lines.map((l) => l.service_id);
      const serviceNames = serviceIds.map((id) => svcById.get(id)?.name).filter(Boolean);
      // Prefer the booking-time snapshot. Fall back to the current
      // service's price only when the snapshot column is null (pre-
      // migration legacy rows or an import that bypassed the POST route).
      const priceMin = lines.reduce((sum, l) => {
        if (l.price_min != null) return sum + l.price_min;
        return sum + (svcById.get(l.service_id)?.price_min || 0);
      }, 0);
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
    // Full-table pending counts (no date window) so a forgotten pending
    // booking from 3 months ago still shows up. Falls back to the windowed
    // slice if the full query errored for some reason. Split into upcoming
    // vs overdue so the dashboard can surface them as separate Needs-
    // Attention rows — different triage urgencies, different list filters.
    const pendingAll = (pendingAllRes?.data as Array<{ date: string }> | null) || null;
    const pendingTotal = pendingAll ? pendingAll.length : shaped.filter((a) => a.status === "pending").length;
    const pendingUpcoming = pendingAll
      ? pendingAll.filter((a) => a.date >= today).length
      : shaped.filter((a) => a.status === "pending" && a.date >= today).length;
    const pendingOverdue = pendingAll
      ? pendingAll.filter((a) => a.date < today).length
      : shaped.filter((a) => a.status === "pending" && a.date < today).length;

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

    // Blog rollup. Counts are bucketed by status so the dashboard
    // card can show the publishing pipeline at a glance. "Latest"
    // is the newest published post (used to surface the freshest
    // SEO content on the dashboard), and recentActivity is the
    // last 8 admin_log rows whose action starts with "blog." —
    // gives the operator a quick "who edited what" feed without
    // jumping to the full activity log.
    const monthStartIso = monthStart.toISOString();
    const [
      blogTotalRes,
      blogPublishedRes,
      blogDraftRes,
      blogScheduledRes,
      blogArchivedRes,
      blogPubMonthRes,
      blogLatestRes,
      blogActivityRes,
    ] = await Promise.all([
      supabase.from("blog_posts").select("id", { count: "exact", head: true }),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "archived"),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .gte("published_at", monthStartIso),
      supabase
        .from("blog_posts")
        .select("id, slug, title, author_name, published_at, cover_image_url, view_count, category:blog_categories(slug, name)")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("admin_log")
        .select("id, action, details, actor_email, created_at")
        .like("action", "blog.%")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    type LatestRow = {
      id: string;
      slug: string;
      title: string;
      author_name: string;
      published_at: string | null;
      cover_image_url: string | null;
      view_count: number | null;
      category: { slug: string; name: string } | null;
    } | null;
    const blogLatest = (blogLatestRes.data as LatestRow) ?? null;

    type ActivityRow = {
      id: string;
      action: string;
      details: string | null;
      actor_email: string | null;
      created_at: string;
    };
    const blogActivity = ((blogActivityRes.data || []) as ActivityRow[]).map((r) => ({
      id: r.id,
      action: r.action,
      // details is JSON we wrote at log time — try to surface the
      // post slug + status as plain fields for the UI.
      ...parseBlogActivityDetails(r.details),
      actorEmail: r.actor_email,
      createdAt: r.created_at,
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
        pendingUpcoming,
        pendingOverdue,
        unreadMessages: messageCount,
        waitlist: waitlistCount,
        lowInventory: lowInventoryCount,
      },
      health: { noShows, cancellations, cancelRate, totalWeek: weekAppts.length },
      blog: {
        total: blogTotalRes.count ?? 0,
        published: blogPublishedRes.count ?? 0,
        drafts: blogDraftRes.count ?? 0,
        scheduled: blogScheduledRes.count ?? 0,
        archived: blogArchivedRes.count ?? 0,
        publishedThisMonth: blogPubMonthRes.count ?? 0,
        latest: blogLatest,
        recentActivity: blogActivity,
      },
    });
  } catch (err) {
    logError("admin/dashboard", err);
    return apiError("Failed to load dashboard.", 500);
  }
}

// admin_log.details is the JSON.stringify(...) we wrote in the blog
// admin handlers — extract slug / status / id so the dashboard UI
// doesn't have to parse JSON in the browser. Returns plain
// fields that the UI can consume directly.
function parseBlogActivityDetails(raw: string | null): {
  slug: string | null;
  status: string | null;
  postId: string | null;
} {
  if (!raw) return { slug: null, status: null, postId: null };
  try {
    const parsed = JSON.parse(raw) as { slug?: unknown; status?: unknown; id?: unknown };
    return {
      slug: typeof parsed.slug === "string" ? parsed.slug : null,
      status: typeof parsed.status === "string" ? parsed.status : null,
      postId: typeof parsed.id === "string" ? parsed.id : null,
    };
  } catch {
    return { slug: null, status: null, postId: null };
  }
}

function emptyPayload() {
  return {
    today: { date: "", revenue: 0, appointments: 0, confirmed: 0, pending: 0, sparkline: [] },
    trend: { revenueWeek: 0, revenueWeekPrev: 0, revenueMonth: 0, revenueMonthPrev: 0, apptsWeek: 0, apptsWeekPrev: 0, apptsMonth: 0, apptsMonthPrev: 0, sparkRevenue: [], sparkAppts: [] },
    timeline: [],
    workload: [],
    attention: { pending: 0, pendingUpcoming: 0, pendingOverdue: 0, unreadMessages: 0, waitlist: 0, lowInventory: 0 },
    health: { noShows: 0, cancellations: 0, cancelRate: 0, totalWeek: 0 },
    blog: { total: 0, published: 0, drafts: 0, scheduled: 0, archived: 0, publishedThisMonth: 0, latest: null, recentActivity: [] },
  };
}
