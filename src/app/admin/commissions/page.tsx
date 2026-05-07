"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import { formatMoney } from "@/lib/format";

interface Stylist { id: string; name: string; color?: string | null; }
// Supabase embed shape — select("*, stylists(name)") returns the
// matched stylist row or null when no FK row exists.
interface Commission { stylist_id: string; commission_percent: number; hourly_rate: number | null; stylists?: { name: string } | null; }

interface Appointment {
  id: string;
  stylist_id: string;
  service_id: string;
  date: string;
  status: string;
  // Booking-time snapshot (PR A). Falls back to svcMap when absent.
  totalPriceMin?: number;
}
interface Service { id: string; price_min: number; }

// Always-two-decimal money via the shared helper (plan bug #4).
const formatCents = (c: number) => formatMoney(c, { from: "cents" });

export default function CommissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPercent, setEditPercent] = useState(50);
  const [period, setPeriod] = useState(30);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const userRole = session?.user?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
    if (status === "authenticated" && userRole !== "admin") router.push("/admin");
  }, [status, router, userRole]);

  useEffect(() => {
    if (status !== "authenticated" || userRole !== "admin") return;
    Promise.all([
      fetch("/api/admin/stylists").then((r) => r.json()),
      fetch("/api/admin/commissions").then((r) => r.json()),
      fetch("/api/admin/appointments").then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
    ]).then(([sty, com, appt, svc]) => {
      setStylists(Array.isArray(sty) ? sty : []);
      setCommissions(Array.isArray(com) ? com : []);
      setAppointments(Array.isArray(appt) ? appt : []);
      setServices(Array.isArray(svc) ? svc : []);
    }).finally(() => setLoading(false));
  }, [status, userRole]);

  if (status !== "authenticated" || userRole !== "admin") return null;

  const commissionMap = Object.fromEntries(commissions.map((c) => [c.stylist_id, c]));
  const svcMap = Object.fromEntries(services.map((s) => [s.id, s]));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const billable = appointments.filter((a) => (a.status === "completed" || a.status === "confirmed") && a.date >= cutoffStr);

  // Skip any "Any Stylist" sentinel / dup that leaked into the list so the
  // payroll totals only reflect real humans.
  const realStylists = stylists.filter((s) => s.name.trim().toLowerCase() !== "any stylist");
  const stylistData = realStylists.map((s) => {
    const appts = billable.filter((a) => a.stylist_id === s.id);
    const revenue = appts.reduce((sum, a) => {
      if (typeof a.totalPriceMin === "number") return sum + a.totalPriceMin;
      return sum + (svcMap[a.service_id]?.price_min || 0);
    }, 0);
    const percent = commissionMap[s.id]?.commission_percent ?? 50;
    const commission = Math.round(revenue * percent / 100);
    return { ...s, revenue, percent, commission, count: appts.length };
  });

  const saveCommission = async (stylistId: string, percent: number) => {
    const res = await fetch("/api/admin/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stylistId, commissionPercent: percent }),
    });
    if (res.ok) {
      setToast({ type: "success", message: "Commission updated." });
      const updated = await fetch("/api/admin/commissions").then((r) => r.json());
      setCommissions(Array.isArray(updated) ? updated : []);
      setEditId(null);
    } else {
      setToast({ type: "error", message: "Failed to save." });
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">Commissions</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Stylist compensation tracking</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="border border-navy/20 px-3 py-2 text-sm font-body">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading...</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {stylistData.map((s) => (
            <div key={s.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body font-bold text-sm">{s.name}</p>
                  <p className="text-navy/40 text-xs font-body">{s.count} appointment{s.count !== 1 ? "s" : ""} · revenue: {formatCents(s.revenue)}</p>
                </div>
                <div className="flex items-center gap-4">
                  {editId === s.id ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} max={100} value={editPercent} onChange={(e) => setEditPercent(parseInt(e.target.value) || 0)} className="w-16 border border-navy/20 px-2 py-1 text-sm font-body" />
                        <span className="text-sm font-body">%</span>
                      </div>
                      <button onClick={() => saveCommission(s.id, editPercent)} className="text-xs font-body bg-navy text-white px-3 py-1 hover:bg-navy/90">Save</button>
                      <button onClick={() => setEditId(null)} className="text-xs font-body text-navy/40 hover:text-navy px-2">Cancel</button>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <p className="text-xs font-body text-navy/40">{s.percent}% commission</p>
                        <p className="font-heading text-lg text-green-600">{formatCents(s.commission)}</p>
                      </div>
                      <button onClick={() => { setEditId(s.id); setEditPercent(s.percent); }} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50">Edit</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-white border border-navy/10 p-5">
        <h3 className="font-heading text-sm mb-2">Payroll Summary</h3>
        <div className="flex justify-between items-center">
          <span className="text-sm font-body text-navy/60">Total commissions owed ({period}d)</span>
          <span className="font-heading text-2xl text-green-600">
            {formatCents(stylistData.reduce((sum, s) => sum + s.commission, 0))}
          </span>
        </div>
      </div>

      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
