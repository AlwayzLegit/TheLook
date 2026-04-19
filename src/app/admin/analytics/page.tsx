"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  service_id: string;
  stylist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_email: string;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  price_min: number;
}

function formatCents(c: number) {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - 90);
    Promise.all([
      fetch(`/api/admin/appointments?from=${from.toISOString().split("T")[0]}`).then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
    ]).then(([appts, svcs]) => {
      setAppointments(Array.isArray(appts) ? appts : []);
      setServices(Array.isArray(svcs) ? svcs : []);
    }).finally(() => setLoading(false));
  }, [status]);

  if (status !== "authenticated") return null;

  const svcMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const rangeAppts = appointments.filter((a) => a.date >= cutoffStr);
  const billable = rangeAppts.filter((a) => a.status === "confirmed" || a.status === "completed");

  // Revenue by day
  const revenueByDay: Record<string, number> = {};
  billable.forEach((a) => {
    revenueByDay[a.date] = (revenueByDay[a.date] || 0) + (svcMap[a.service_id]?.price_min || 0);
  });
  const dailyRevenue = Object.entries(revenueByDay).sort(([a], [b]) => a.localeCompare(b));
  const maxRevenue = Math.max(...dailyRevenue.map(([, v]) => v), 1);

  // Busiest day of week
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  billable.forEach((a) => {
    const d = new Date(a.date + "T00:00:00").getDay();
    dayOfWeekCounts[d]++;
  });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDayCount = Math.max(...dayOfWeekCounts, 1);

  // Peak hours
  const hourCounts: Record<number, number> = {};
  billable.forEach((a) => {
    const h = parseInt(a.start_time.split(":")[0]);
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const peakHours = Object.entries(hourCounts)
    .map(([h, c]) => ({ hour: parseInt(h), count: c }))
    .sort((a, b) => a.hour - b.hour);
  const maxHourCount = Math.max(...peakHours.map((p) => p.count), 1);

  // Service breakdown
  const svcCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  billable.forEach((a) => {
    const s = svcMap[a.service_id];
    if (!s) return;
    const cat = s.category;
    if (!svcCounts[cat]) svcCounts[cat] = { name: cat, count: 0, revenue: 0 };
    svcCounts[cat].count++;
    svcCounts[cat].revenue += s.price_min;
  });
  const svcBreakdown = Object.values(svcCounts).sort((a, b) => b.count - a.count);
  const totalBookings = svcBreakdown.reduce((s, v) => s + v.count, 0) || 1;

  // Client retention
  const clientEmails = new Set<string>();
  const clientFirstVisit: Record<string, string> = {};
  appointments.forEach((a) => {
    if (a.status !== "confirmed" && a.status !== "completed") return;
    clientEmails.add(a.client_email);
    if (!clientFirstVisit[a.client_email] || a.date < clientFirstVisit[a.client_email]) {
      clientFirstVisit[a.client_email] = a.date;
    }
  });
  const newClients = Object.values(clientFirstVisit).filter((d) => d >= cutoffStr).length;
  const returningClients = billable.length > 0
    ? new Set(billable.filter((a) => clientFirstVisit[a.client_email] < cutoffStr).map((a) => a.client_email)).size
    : 0;

  // Summary stats
  const totalRevenue = billable.reduce((s, a) => s + (svcMap[a.service_id]?.price_min || 0), 0);
  const avgTransaction = billable.length > 0 ? Math.round(totalRevenue / billable.length) : 0;
  const totalHours = billable.reduce((s, a) => s + (timeToMin(a.end_time) - timeToMin(a.start_time)), 0) / 60;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">Analytics</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Business insights and trends</p>
        </div>
        <select value={range} onChange={(e) => setRange(parseInt(e.target.value))} className="border border-navy/20 px-3 py-2 text-sm font-body">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading analytics...</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 border border-navy/10">
              <p className="text-navy/40 text-xs font-body">Total Revenue</p>
              <p className="font-heading text-2xl mt-1 text-green-600">{formatCents(totalRevenue)}</p>
            </div>
            <div className="bg-white p-5 border border-navy/10">
              <p className="text-navy/40 text-xs font-body">Appointments</p>
              <p className="font-heading text-2xl mt-1">{billable.length}</p>
            </div>
            <div className="bg-white p-5 border border-navy/10">
              <p className="text-navy/40 text-xs font-body">Avg Transaction</p>
              <p className="font-heading text-2xl mt-1">{formatCents(avgTransaction)}</p>
            </div>
            <div className="bg-white p-5 border border-navy/10">
              <p className="text-navy/40 text-xs font-body">Hours Booked</p>
              <p className="font-heading text-2xl mt-1">{Math.round(totalHours)}</p>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="bg-white p-5 border border-navy/10 mb-8">
            <h3 className="font-heading text-sm mb-4">Daily Revenue</h3>
            {dailyRevenue.length === 0 ? (
              <p className="text-navy/30 text-xs font-body">No revenue data for this period</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {dailyRevenue.map(([date, rev]) => (
                  <div key={date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div
                      className="w-full bg-green-400 hover:bg-green-500 rounded-t-sm transition-colors min-h-[2px]"
                      style={{ height: `${(rev / maxRevenue) * 100}%` }}
                    />
                    <div className="hidden group-hover:block absolute -top-8 bg-navy text-white text-[10px] font-body px-2 py-1 rounded whitespace-nowrap z-10">
                      {date.slice(5)}: {formatCents(rev)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Busiest days */}
            <div className="bg-white p-5 border border-navy/10">
              <h3 className="font-heading text-sm mb-4">Busiest Days of Week</h3>
              <div className="space-y-2">
                {dayNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-body text-navy/50 w-8">{name}</span>
                    <div className="flex-1 h-5 bg-navy/5 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded"
                        style={{ width: `${(dayOfWeekCounts[i] / maxDayCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-body text-navy/40 w-6 text-right">{dayOfWeekCounts[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak hours */}
            <div className="bg-white p-5 border border-navy/10">
              <h3 className="font-heading text-sm mb-4">Peak Hours</h3>
              <div className="space-y-2">
                {peakHours.map((p) => (
                  <div key={p.hour} className="flex items-center gap-3">
                    <span className="text-xs font-body text-navy/50 w-12">
                      {p.hour % 12 || 12}{p.hour >= 12 ? "pm" : "am"}
                    </span>
                    <div className="flex-1 h-5 bg-navy/5 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded"
                        style={{ width: `${(p.count / maxHourCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-body text-navy/40 w-6 text-right">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Service breakdown */}
            <div className="bg-white p-5 border border-navy/10">
              <h3 className="font-heading text-sm mb-4">Service Categories</h3>
              <div className="space-y-3">
                {svcBreakdown.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs font-body mb-1">
                      <span className="text-navy/60">{s.name}</span>
                      <span className="text-navy/40">{s.count} bookings &middot; {formatCents(s.revenue)}</span>
                    </div>
                    <div className="h-2 bg-navy/5 rounded overflow-hidden">
                      <div
                        className="h-full bg-rose rounded"
                        style={{ width: `${(s.count / totalBookings) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client retention */}
            <div className="bg-white p-5 border border-navy/10">
              <h3 className="font-heading text-sm mb-1">Client Retention</h3>
              <p className="text-[10px] text-navy/40 font-body mb-4">
                Counts only clients with a confirmed or completed visit in the last {range} days.
                Full client list lives in <span className="text-navy/60">Clients</span>.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-heading text-2xl">{clientEmails.size}</p>
                  <p className="text-xs font-body text-navy/50 mt-1">Active ({range}d)</p>
                </div>
                <div>
                  <p className="font-heading text-2xl text-blue-600">{newClients}</p>
                  <p className="text-xs font-body text-navy/50 mt-1">New ({range}d)</p>
                </div>
                <div>
                  <p className="font-heading text-2xl text-green-600">{returningClients}</p>
                  <p className="text-xs font-body text-navy/50 mt-1">Returning</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
