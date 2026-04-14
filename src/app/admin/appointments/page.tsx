"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePolledAppointments } from "@/hooks/usePolledAppointments";
import AdminToast from "@/components/admin/AdminToast";

interface Service {
  id: string;
  name: string;
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
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function AppointmentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { appointments: realtimeAppts, loading, error, lastUpdate, refresh } = usePolledAppointments({
    enabled: status === "authenticated",
  });
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [stylistFilter, setStylistFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
  }, [status]);

  if (status !== "authenticated") return null;

  // Enrich appointments
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const stylistMap = Object.fromEntries(stylists.map((s) => [s.id, s]));

  const enrichedAppts: EnrichedAppointment[] = realtimeAppts.map((a) => ({
    ...a,
    serviceName: serviceMap[a.service_id]?.name || "Unknown Service",
    stylistName: stylistMap[a.stylist_id]?.name || "Unknown Stylist",
  }));

  const applyDatePreset = (preset: "today" | "tomorrow" | "thisWeek" | "clear") => {
    const today = new Date();
    const toIso = (d: Date) => d.toISOString().split("T")[0];
    if (preset === "today") {
      const d = toIso(today);
      setDateFrom(d);
      setDateTo(d);
      return;
    }
    if (preset === "tomorrow") {
      const d = new Date(today);
      d.setDate(today.getDate() + 1);
      const iso = toIso(d);
      setDateFrom(iso);
      setDateTo(iso);
      return;
    }
    if (preset === "thisWeek") {
      const start = new Date(today);
      const end = new Date(today);
      end.setDate(today.getDate() + 7);
      setDateFrom(toIso(start));
      setDateTo(toIso(end));
      return;
    }
    setDateFrom("");
    setDateTo("");
  };

  // Apply filters
  let filteredAppts = enrichedAppts;
  if (dateFrom) {
    filteredAppts = filteredAppts.filter((a) => a.date >= dateFrom);
  }
  if (dateTo) {
    filteredAppts = filteredAppts.filter((a) => a.date <= dateTo);
  }
  if (statusFilter) {
    filteredAppts = filteredAppts.filter((a) => a.status === statusFilter);
  }
  if (serviceFilter) {
    filteredAppts = filteredAppts.filter((a) => a.service_id === serviceFilter);
  }
  if (stylistFilter) {
    filteredAppts = filteredAppts.filter((a) => a.stylist_id === stylistFilter);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filteredAppts = filteredAppts.filter(
      (a) =>
        a.client_name.toLowerCase().includes(q) ||
        a.client_email.toLowerCase().includes(q) ||
        (a.client_phone || "").toLowerCase().includes(q)
    );
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setPendingStatusId(id);
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to update appointment status." });
        return;
      }
      setToast({ type: "success", message: `Appointment marked as ${newStatus}.` });
      refresh();
    } finally {
      setPendingStatusId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">Appointments</h1>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-xs text-navy/40 font-body">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-body">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live
          </span>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm font-body text-red-600">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => applyDatePreset("today")}
          className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
        >
          Today
        </button>
        <button
          onClick={() => applyDatePreset("tomorrow")}
          className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
        >
          Tomorrow
        </button>
        <button
          onClick={() => applyDatePreset("thisWeek")}
          className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
        >
          Next 7 Days
        </button>
        <button
          onClick={() => applyDatePreset("clear")}
          className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
        >
          Clear Dates
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client name, email, phone"
          className="border border-navy/20 px-3 py-2 text-sm font-body min-w-[260px]"
        />
        <input 
          type="date" 
          value={dateFrom} 
          onChange={(e) => setDateFrom(e.target.value)} 
          className="border border-navy/20 px-3 py-2 text-sm font-body" 
        />
        <input 
          type="date" 
          value={dateTo} 
          onChange={(e) => setDateTo(e.target.value)} 
          className="border border-navy/20 px-3 py-2 text-sm font-body" 
          placeholder="To" 
        />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="border border-navy/20 px-3 py-2 text-sm font-body"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="no_show">No Show</option>
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="border border-navy/20 px-3 py-2 text-sm font-body"
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={stylistFilter}
          onChange={(e) => setStylistFilter(e.target.value)}
          className="border border-navy/20 px-3 py-2 text-sm font-body"
        >
          <option value="">All stylists</option>
          {stylists.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm font-body border border-navy/20 hover:bg-navy/5"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading appointments...</p>
      ) : filteredAppts.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No appointments found.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {filteredAppts.map((appt) => (
            <div key={appt.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-body font-bold text-sm">{appt.client_name}</p>
                  <p className="text-navy/50 text-xs font-body">{appt.client_email} {appt.client_phone && `| ${appt.client_phone}`}</p>
                  <p className="text-navy/60 text-sm font-body mt-1">
                    {appt.serviceName} with {appt.stylistName}
                  </p>
                  {appt.notes && <p className="text-navy/40 text-xs font-body mt-1 italic">&ldquo;{appt.notes}&rdquo;</p>}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-body text-sm">{formatDate(appt.date)}</p>
                  <p className="font-body text-sm">{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</p>
                  <span className={`inline-block mt-1 text-xs font-body px-2 py-0.5 ${
                    appt.status === "confirmed" ? "bg-green-100 text-green-700" :
                    appt.status === "cancelled" ? "bg-red-100 text-red-700" :
                    appt.status === "completed" ? "bg-blue-100 text-blue-700" :
                    appt.status === "no_show" ? "bg-gray-100 text-gray-700" :
                    "bg-gold/20 text-gold"
                  }`}>
                    {appt.status}
                  </span>
                </div>
              </div>

              {appt.status !== "cancelled" && appt.status !== "completed" && (
                <div className="flex gap-2 mt-3">
                  {appt.status === "pending" && (
                    <button 
                      onClick={() => updateStatus(appt.id, "confirmed")} 
                      disabled={pendingStatusId === appt.id}
                      className="text-xs font-body text-green-600 border border-green-200 px-3 py-1 hover:bg-green-50"
                    >
                      {pendingStatusId === appt.id ? "Updating..." : "Confirm"}
                    </button>
                  )}
                  <button 
                    onClick={() => updateStatus(appt.id, "completed")} 
                    disabled={pendingStatusId === appt.id}
                    className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50"
                  >
                    {pendingStatusId === appt.id ? "Updating..." : "Complete"}
                  </button>
                  <button 
                    onClick={() => updateStatus(appt.id, "no_show")} 
                    disabled={pendingStatusId === appt.id}
                    className="text-xs font-body text-gray-600 border border-gray-200 px-3 py-1 hover:bg-gray-50"
                  >
                    {pendingStatusId === appt.id ? "Updating..." : "No Show"}
                  </button>
                  <button 
                    onClick={() => updateStatus(appt.id, "cancelled")} 
                    disabled={pendingStatusId === appt.id}
                    className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50"
                  >
                    {pendingStatusId === appt.id ? "Updating..." : "Cancel"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {toast ? (
        <AdminToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
