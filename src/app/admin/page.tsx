"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePolledAppointments } from "@/hooks/usePolledAppointments";
import ReviewStatsWidget from "@/components/admin/ReviewStatsWidget";

interface Service {
  id: string;
  name: string;
  price_min: number;
}

interface Stylist {
  id: string;
  name: string;
}

interface EnrichedAppointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service_id: string;
  stylist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  staff_notes?: string | null;
  serviceName: string;
  stylistName: string;
  priceMin: number;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { appointments: realtimeAppts, loading, error, lastUpdate } = usePolledAppointments({
    enabled: status === "authenticated",
  });
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/admin/services")
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []));

    fetch("/api/admin/stylists")
      .then((r) => r.json())
      .then((data) => setStylists(Array.isArray(data) ? data : []));

    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((data) => setMessageCount(Array.isArray(data) ? data.length : 0));
  }, [status]);

  if (status !== "authenticated") return null;

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const stylistMap = Object.fromEntries(stylists.map((s) => [s.id, s]));

  const enrichedAppts: EnrichedAppointment[] = realtimeAppts.map((a) => {
    // Multi-service revenue: sum priceMin across all services on the appointment.
    const ids = (a.serviceIds && a.serviceIds.length > 0)
      ? a.serviceIds
      : a.service_id
        ? [a.service_id]
        : [];
    const priceMin = ids.reduce((sum, id) => sum + (serviceMap[id]?.price_min || 0), 0);
    return {
      ...a,
      serviceName: a.serviceName || serviceMap[a.service_id]?.name || "Unknown Service",
      stylistName: a.stylistName || stylistMap[a.stylist_id]?.name || "Unknown Stylist",
      priceMin,
    };
  });

  const today = new Date().toISOString().split("T")[0];

  // Date helpers
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().split("T")[0];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  // Today's appointments
  const todayAppts = enrichedAppts
    .filter((a) => a.date === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Upcoming (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingAppts = enrichedAppts
    .filter((a) => {
      const d = new Date(a.date);
      return d > new Date(today) && d <= nextWeek;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5);

  const confirmed = todayAppts.filter((a) => a.status === "confirmed");
  const pending = todayAppts.filter((a) => a.status === "pending");

  // ── Revenue ──
  const billable = (a: EnrichedAppointment) => a.status === "confirmed" || a.status === "completed";
  const revenueToday = enrichedAppts.filter((a) => a.date === today && billable(a)).reduce((s, a) => s + a.priceMin, 0);
  const revenueWeek = enrichedAppts.filter((a) => a.date >= weekStart && billable(a)).reduce((s, a) => s + a.priceMin, 0);
  const revenueMonth = enrichedAppts.filter((a) => a.date >= monthStart && billable(a)).reduce((s, a) => s + a.priceMin, 0);

  // ── No-shows & cancellations (this week) ──
  const weekAppts = enrichedAppts.filter((a) => a.date >= weekStart);
  const noShows = weekAppts.filter((a) => a.status === "no_show").length;
  const cancelled = weekAppts.filter((a) => a.status === "cancelled").length;
  const cancelRate = weekAppts.length > 0 ? Math.round(((noShows + cancelled) / weekAppts.length) * 100) : 0;

  // ── Stylist workload today ──
  const stylistWorkload = stylists.map((s) => {
    const appts = todayAppts.filter((a) => a.stylist_id === s.id && billable(a));
    const totalMins = appts.reduce((sum, a) => {
      return sum + (timeToMinutes(a.end_time) - timeToMinutes(a.start_time));
    }, 0);
    return {
      ...s,
      count: appts.length,
      hours: Math.round(totalMins / 60 * 10) / 10,
      revenue: appts.reduce((sum, a) => sum + a.priceMin, 0),
    };
  }).filter((s) => s.count > 0 || todayAppts.length > 0)
    .sort((a, b) => b.count - a.count);

  // ── Revenue by stylist (this week) ──
  const stylistRevenue = stylists.map((s) => {
    const rev = enrichedAppts
      .filter((a) => a.stylist_id === s.id && a.date >= weekStart && billable(a))
      .reduce((sum, a) => sum + a.priceMin, 0);
    return { ...s, revenue: rev };
  }).filter((s) => s.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // ── Popular services (this month) ──
  const servicePopularity = services.map((s) => {
    const count = enrichedAppts.filter(
      (a) => a.service_id === s.id && a.date >= monthStart && billable(a)
    ).length;
    return { ...s, count };
  }).filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-heading text-3xl">Dashboard</h1>
        {lastUpdate && (
          <span className="text-xs text-navy/40 font-body">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
      <p className="text-navy/50 font-body text-sm mb-8">
        Welcome back, {session?.user?.name}
      </p>

      {/* ── Row 1: Appointment Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Link href="/admin/appointments" className="bg-white p-5 border border-navy/10 hover:border-navy/20 transition-colors">
          <p className="text-navy/40 text-xs font-body">Today</p>
          <p className="font-heading text-2xl mt-1">{todayAppts.length}</p>
          <p className="text-navy/30 text-xs font-body mt-1">appointments</p>
        </Link>
        <div className="bg-white p-5 border border-navy/10">
          <p className="text-navy/40 text-xs font-body">Confirmed</p>
          <p className="font-heading text-2xl mt-1 text-green-600">{confirmed.length}</p>
          <p className="text-navy/30 text-xs font-body mt-1">of {todayAppts.length} today</p>
        </div>
        <div className="bg-white p-5 border border-navy/10">
          <p className="text-navy/40 text-xs font-body">Pending</p>
          <p className={`font-heading text-2xl mt-1 ${pending.length > 0 ? "text-amber-500" : "text-navy/30"}`}>{pending.length}</p>
          <p className="text-navy/30 text-xs font-body mt-1">need confirmation</p>
        </div>
        <Link href="/admin/messages" className="bg-white p-5 border border-navy/10 hover:border-navy/20 transition-colors">
          <p className="text-navy/40 text-xs font-body">Messages</p>
          <p className={`font-heading text-2xl mt-1 ${messageCount > 0 ? "text-blue-600" : "text-navy/30"}`}>{messageCount}</p>
          <p className="text-navy/30 text-xs font-body mt-1">contact inquiries</p>
        </Link>
      </div>

      {/* ── Row 2: Revenue + Reviews ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 border border-navy/10">
          <p className="text-navy/40 text-xs font-body">Revenue Today</p>
          <p className="font-heading text-2xl mt-1 text-green-600">{formatCents(revenueToday)}</p>
        </div>
        <div className="bg-white p-5 border border-navy/10">
          <p className="text-navy/40 text-xs font-body">This Week</p>
          <p className="font-heading text-2xl mt-1">{formatCents(revenueWeek)}</p>
        </div>
        <div className="bg-white p-5 border border-navy/10">
          <p className="text-navy/40 text-xs font-body">This Month</p>
          <p className="font-heading text-2xl mt-1">{formatCents(revenueMonth)}</p>
        </div>
        <ReviewStatsWidget />
      </div>

      {/* ── Row 3: Health & Workload ── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* No-shows & cancellations */}
        <div className="bg-white p-5 border border-navy/10">
          <h3 className="font-heading text-sm mb-3">This Week&apos;s Health</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-body text-navy/50">No-shows</span>
              <span className={`text-sm font-heading ${noShows > 0 ? "text-red-500" : "text-green-600"}`}>{noShows}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-body text-navy/50">Cancellations</span>
              <span className={`text-sm font-heading ${cancelled > 0 ? "text-amber-500" : "text-green-600"}`}>{cancelled}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-navy/5">
              <span className="text-xs font-body text-navy/50">Cancel rate</span>
              <span className={`text-sm font-heading ${cancelRate > 15 ? "text-red-500" : cancelRate > 5 ? "text-amber-500" : "text-green-600"}`}>
                {cancelRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Stylist workload today */}
        <div className="bg-white p-5 border border-navy/10">
          <h3 className="font-heading text-sm mb-3">Stylist Workload Today</h3>
          {stylistWorkload.length === 0 ? (
            <p className="text-navy/30 text-xs font-body">No appointments today</p>
          ) : (
            <div className="space-y-2">
              {stylistWorkload.map((s) => (
                <div key={s.id} className="flex justify-between items-center">
                  <span className="text-xs font-body text-navy/60">{s.name}</span>
                  <span className="text-xs font-body text-navy/40">
                    {s.count} appts &middot; {s.hours}h &middot; {formatCents(s.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue by stylist this week */}
        <div className="bg-white p-5 border border-navy/10">
          <h3 className="font-heading text-sm mb-3">Revenue by Stylist (Week)</h3>
          {stylistRevenue.length === 0 ? (
            <p className="text-navy/30 text-xs font-body">No revenue data</p>
          ) : (
            <div className="space-y-2">
              {stylistRevenue.map((s) => (
                <div key={s.id} className="flex justify-between items-center">
                  <span className="text-xs font-body text-navy/60">{s.name}</span>
                  <span className="text-sm font-heading">{formatCents(s.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Popular Services ── */}
      {servicePopularity.length > 0 && (
        <div className="mb-8">
          <h3 className="font-heading text-sm mb-3">Popular Services (This Month)</h3>
          <div className="flex flex-wrap gap-3">
            {servicePopularity.map((s, i) => (
              <div key={s.id} className="bg-white px-4 py-2 border border-navy/10 flex items-center gap-3">
                <span className="text-xs font-heading text-navy/30">#{i + 1}</span>
                <div>
                  <p className="text-sm font-body font-bold">{s.name}</p>
                  <p className="text-xs font-body text-navy/40">{s.count} booking{s.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 4: Today's Schedule + Upcoming ── */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl">Today&apos;s Schedule</h2>
            <Link href="/admin/appointments" className="text-rose text-sm font-body hover:underline">
              View all &rarr;
            </Link>
          </div>

          {loading ? (
            <p className="text-navy/40 font-body text-sm">Loading...</p>
          ) : error ? (
            <p className="text-red-600 font-body text-sm">{error}</p>
          ) : todayAppts.length === 0 ? (
            <p className="text-navy/40 font-body text-sm">No appointments today.</p>
          ) : (
            <div className="bg-white border border-navy/10 divide-y divide-navy/5">
              {todayAppts.map((appt) => (
                <div key={appt.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-body font-bold text-sm">{appt.client_name}</p>
                    <p className="text-navy/50 text-xs font-body">
                      {appt.serviceName} with {appt.stylistName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-sm">{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</p>
                    <span className={`text-xs font-body px-2 py-0.5 ${
                      appt.status === "confirmed" ? "bg-green-100 text-green-700" :
                      appt.status === "completed" ? "bg-blue-100 text-blue-700" :
                      appt.status === "cancelled" ? "bg-red-100 text-red-700" :
                      appt.status === "no_show" ? "bg-gray-100 text-gray-600" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-heading text-xl mb-4">Upcoming (Next 7 Days)</h2>
          {loading ? (
            <p className="text-navy/40 font-body text-sm">Loading...</p>
          ) : upcomingAppts.length === 0 ? (
            <p className="text-navy/40 font-body text-sm">No upcoming appointments.</p>
          ) : (
            <div className="bg-white border border-navy/10 divide-y divide-navy/5">
              {upcomingAppts.map((appt) => (
                <div key={appt.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-body font-bold text-sm">{appt.client_name}</p>
                    <p className="text-navy/50 text-xs font-body">
                      {appt.serviceName} with {appt.stylistName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-sm">{new Date(appt.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                    <p className="font-body text-xs text-navy/60">{formatTime(appt.start_time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="mt-8 flex items-center gap-2 text-xs text-navy/40 font-body">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Auto-refreshing every 15 seconds
      </div>
    </div>
  );
}
