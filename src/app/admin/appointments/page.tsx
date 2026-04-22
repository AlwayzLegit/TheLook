"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePolledAppointments } from "@/hooks/usePolledAppointments";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { downloadIcs } from "@/lib/icsExport";
import { todayISOInLA, addDaysISOInLA } from "@/lib/datetime";
import AppointmentCalendar from "@/components/admin/AppointmentCalendar";
import NewAppointmentSheet from "@/components/admin/NewAppointmentSheet";
import AppointmentActionsModal from "@/components/admin/AppointmentActionsModal";
import { Button } from "@/components/ui/Button";
import { Badge, badgeToneForStatus } from "@/components/ui/Badge";
import { formatTime as fmtTime, formatDate as fmtDate } from "@/lib/format";

interface Service {
  id: string;
  name: string;
}

interface Stylist {
  id: string;
  name: string;
  color?: string | null;
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
  reminder_sent?: boolean;
  requested_stylist?: boolean | null;
  serviceName: string;
  stylistName: string;
  stylistColor?: string | null;
  archived_at?: string | null;
  // Card-on-file metadata — populated by the deposit flow.
  stripe_customer_id?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  cancellation_fee_charged_cents?: number | null;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function AppointmentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Hydrate URL-driven filters SYNCHRONOUSLY at useState init so the first
  // (and only) fetch goes out with the correct scope. Previously the hydration
  // ran in a useEffect after mount, which caused a first fetch with the
  // default scope → brief empty render → second fetch with the real scope.
  const qStatus = searchParams.get("status");
  const qOverdue = searchParams.get("overdue") === "true";
  const qRange = searchParams.get("range");
  const qDateFrom = searchParams.get("dateFrom");
  const qDateTo = searchParams.get("dateTo");
  const qStylistId = searchParams.get("stylistId");
  const arrivedFromLink = !!(qStatus || qRange || qDateFrom || qDateTo || qStylistId || qOverdue);
  const yesterdayISO = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split("T")[0];
  })();

  const [listTab, setListTab] = useState<"active" | "archived">("active");
  const [showTest, setShowTest] = useState(false);
  // Server-side history window. "Upcoming" matches analytics' revenue window
  // when paired with "Last 90 days" so the two pages stop looking out of sync.
  const [timeRange, setTimeRange] = useState<"upcoming" | "past30" | "past90" | "all">(() => {
    if (qRange === "upcoming" || qRange === "past30" || qRange === "past90" || qRange === "all") return qRange;
    if (qOverdue) return "past90"; // overdue rows are in the past — need history pulled
    return "upcoming";
  });
  const fromDateForFetch = (() => {
    if (timeRange === "upcoming") return undefined; // hook default = today+
    if (timeRange === "all") return "";
    const days = timeRange === "past30" ? 30 : 90;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  })();
  const { appointments: realtimeAppts, loading, error, lastUpdate, refresh } = usePolledAppointments({
    enabled: status === "authenticated",
    archived: listTab === "archived",
    includeTest: showTest,
    fromDate: fromDateForFetch,
  });
  const [selectedAppt, setSelectedAppt] = useState<EnrichedAppointment | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [dateFrom, setDateFrom] = useState(qDateFrom || "");
  const [dateTo, setDateTo] = useState(() => qDateTo || (qOverdue ? yesterdayISO : ""));
  const [statusFilter, setStatusFilter] = useState(qStatus || (qOverdue ? "pending" : ""));
  const [serviceFilter, setServiceFilter] = useState("");
  const [stylistFilter, setStylistFilter] = useState(qStylistId || "");
  const [search, setSearch] = useState("");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ date: "", start_time: "", end_time: "", staff_notes: "" });
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; name: string } | null>(null);
  const [clientHistoryId, setClientHistoryId] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<EnrichedAppointment[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // Landing from a Needs-Attention link defaults to the list view so the
  // rows we counted on the dashboard are immediately visible.
  const [view, setView] = useState<"calendar" | "list">(arrivedFromLink ? "list" : "calendar");
  const [showNewAppt, setShowNewAppt] = useState(false);

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

  // Enrich appointments. The API already returns serviceName / stylistName for
  // multi-service support; fall back to client-side lookup if missing.
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const stylistMap = Object.fromEntries(stylists.map((s) => [s.id, s]));

  const enrichedAppts: EnrichedAppointment[] = realtimeAppts.map((a) => ({
    ...a,
    serviceName: a.serviceName || serviceMap[a.service_id]?.name || "Unknown Service",
    stylistName: a.stylistName || stylistMap[a.stylist_id]?.name || "Unknown Stylist",
    stylistColor: stylistMap[a.stylist_id]?.color || null,
  }));

  const applyDatePreset = (preset: "today" | "tomorrow" | "thisWeek" | "clear") => {
    if (preset === "today") {
      const d = todayISOInLA();
      setDateFrom(d);
      setDateTo(d);
      return;
    }
    if (preset === "tomorrow") {
      const d = addDaysISOInLA(1);
      setDateFrom(d);
      setDateTo(d);
      return;
    }
    if (preset === "thisWeek") {
      setDateFrom(todayISOInLA());
      setDateTo(addDaysISOInLA(7));
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

  const exportCsv = () => {
    const headers = ["Date", "Time", "Client", "Email", "Phone", "Service", "Stylist", "Status"];
    const rows = filteredAppts.map((a) => [
      a.date,
      `${formatTime(a.start_time)} - ${formatTime(a.end_time)}`,
      a.client_name,
      a.client_email,
      a.client_phone || "",
      a.serviceName,
      a.stylistName,
      a.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (appt: EnrichedAppointment) => {
    setEditingId(appt.id);
    setEditFields({
      date: appt.date,
      start_time: appt.start_time,
      end_time: appt.end_time,
      staff_notes: appt.staff_notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      setPendingStatusId(editingId);
      const res = await fetch(`/api/admin/appointments/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to update appointment." });
        return;
      }
      setToast({ type: "success", message: "Appointment updated." });
      setEditingId(null);
      refresh();
    } finally {
      setPendingStatusId(null);
    }
  };

  // Client history lookup
  const lookupClient = (email: string) => {
    const history = enrichedAppts.filter((a) => a.client_email === email);
    setClientHistory(history);
    setClientHistoryId(clientHistoryId === email ? null : email);
  };

  // Count repeat visits and no-shows for a client email
  const clientStats = (email: string) => {
    const all = enrichedAppts.filter((a) => a.client_email === email);
    return {
      visits: all.filter((a) => a.status === "completed" || a.status === "confirmed").length,
      noShows: all.filter((a) => a.status === "no_show").length,
      total: all.length,
    };
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setPendingStatusId(id);
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({
          type: "error",
          message: data.error || `Couldn't mark this appointment as ${newStatus}.`,
        });
        return;
      }
      setToast({ type: "success", message: `Appointment marked as ${newStatus}.` });
      refresh();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setPendingStatusId(null);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("Delete this appointment permanently? This can't be undone.")) return;
    try {
      setPendingStatusId(id);
      const res = await fetch(`/api/admin/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ type: "error", message: data.error || "Failed to delete appointment." });
        return;
      }
      setToast({ type: "success", message: "Appointment deleted." });
      refresh();
    } finally {
      setPendingStatusId(null);
    }
  };

  const archiveAppointment = async (id: string) => {
    try {
      setPendingStatusId(id);
      const res = await fetch(`/api/admin/appointments/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ type: "error", message: data.error || "Failed to archive appointment." });
        return;
      }
      setToast({
        type: "success",
        message: "Archived. Auto-deletes after 30 days (or delete permanently any time).",
      });
      setSelectedAppt(null);
      refresh();
    } finally {
      setPendingStatusId(null);
    }
  };

  const unarchiveAppointment = async (id: string) => {
    try {
      setPendingStatusId(id);
      const res = await fetch(`/api/admin/appointments/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to restore appointment." });
        return;
      }
      setToast({ type: "success", message: "Appointment restored." });
      setSelectedAppt(null);
      refresh();
    } finally {
      setPendingStatusId(null);
    }
  };

  const saveEditFromModal = async (
    id: string,
    fields: { date: string; start_time: string; end_time: string; staff_notes: string },
  ) => {
    try {
      setPendingStatusId(id);
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to update appointment." });
        return;
      }
      setToast({ type: "success", message: "Appointment updated." });
      refresh();
    } finally {
      setPendingStatusId(null);
    }
  };

  const modalStatusChange = async (id: string, newStatus: string) => {
    await updateStatus(id, newStatus);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl">Appointments</h1>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <Button variant="primary" size="sm" onClick={() => setShowNewAppt(true)}>
            + New Appointment
          </Button>
          <button
            onClick={() => {
              const events = filteredAppts.filter((a) => a.status !== "cancelled").map((a) => ({
                title: `${a.client_name} - ${a.serviceName}`,
                description: `${a.serviceName} with ${a.stylistName}\n${a.client_email}${a.client_phone ? `\n${a.client_phone}` : ""}`,
                location: "919 South Central Ave Suite #E, Glendale, CA 91204",
                date: a.date,
                startTime: a.start_time,
                endTime: a.end_time,
              }));
              downloadIcs(events);
            }}
            className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
          >
            Calendar
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
          >
            Print
          </button>
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
          >
            Export CSV
          </button>
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

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="inline-flex border border-navy/20">
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-1.5 text-xs font-body uppercase tracking-widest transition-colors ${
              view === "calendar" ? "bg-navy text-white" : "text-navy hover:bg-navy/5"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-1.5 text-xs font-body uppercase tracking-widest border-l border-navy/20 transition-colors ${
              view === "list" ? "bg-navy text-white" : "text-navy hover:bg-navy/5"
            }`}
          >
            List
          </button>
        </div>

        <div className="inline-flex border border-navy/20">
          <button
            onClick={() => setListTab("active")}
            className={`px-4 py-1.5 text-xs font-body uppercase tracking-widest transition-colors ${
              listTab === "active" ? "bg-navy text-white" : "text-navy hover:bg-navy/5"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setListTab("archived")}
            className={`px-4 py-1.5 text-xs font-body uppercase tracking-widest border-l border-navy/20 transition-colors ${
              listTab === "archived" ? "bg-navy text-white" : "text-navy hover:bg-navy/5"
            }`}
          >
            Archived
          </button>
        </div>

        {listTab === "archived" && (
          <span className="text-xs font-body text-navy/50">
            Archived bookings auto-delete 30 days after they were archived.
          </span>
        )}

        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-body text-navy/60">
          <input
            type="checkbox"
            checked={showTest}
            onChange={(e) => setShowTest(e.target.checked)}
            className="w-4 h-4"
          />
          Show test bookings
        </label>
      </div>

      {listTab === "active" && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs font-body uppercase tracking-widest text-navy/50">
            History window
          </span>
          <div className="inline-flex border border-navy/20">
            {([
              { v: "upcoming", label: "Upcoming only" },
              { v: "past30", label: "Last 30 days + upcoming" },
              { v: "past90", label: "Last 90 days + upcoming" },
              { v: "all", label: "All time" },
            ] as const).map((opt, i) => (
              <button
                key={opt.v}
                onClick={() => setTimeRange(opt.v)}
                className={`px-3 py-1.5 text-xs font-body uppercase tracking-widest transition-colors ${
                  i > 0 ? "border-l border-navy/20" : ""
                } ${
                  timeRange === opt.v ? "bg-navy text-white" : "text-navy hover:bg-navy/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs font-body text-navy/40">
            Controls how far back the list pulls from the server.
          </span>
        </div>
      )}

      <div className="mb-4">
        <span className="block text-xs font-body uppercase tracking-widest text-navy/50 mb-2">
          Jump to date
        </span>
        <div className="flex flex-wrap gap-3">
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
            Next 7 days
          </button>
          <button
            onClick={() => applyDatePreset("clear")}
            className="px-3 py-1.5 text-xs font-body border border-navy/20 hover:bg-navy/5"
          >
            Any date
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-body uppercase tracking-widest text-navy/50">Search client</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, or phone"
            className="border border-navy/20 px-3 py-2 text-sm font-body min-w-[260px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-body uppercase tracking-widest text-navy/50">From date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-navy/20 px-3 py-2 text-sm font-body"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-body uppercase tracking-widest text-navy/50">To date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-navy/20 px-3 py-2 text-sm font-body"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-body uppercase tracking-widest text-navy/50">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-navy/20 px-3 py-2 text-sm font-body"
          >
            <option value="">Any status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="no_show">No show</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-body uppercase tracking-widest text-navy/50">Service</label>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="border border-navy/20 px-3 py-2 text-sm font-body"
          >
            <option value="">Any service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-body uppercase tracking-widest text-navy/50">Stylist</label>
          <select
            value={stylistFilter}
            onChange={(e) => setStylistFilter(e.target.value)}
            className="border border-navy/20 px-3 py-2 text-sm font-body"
          >
            <option value="">Any stylist</option>
            {stylists.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => {
            setDateFrom("");
            setDateTo("");
            setStatusFilter("");
            setServiceFilter("");
            setStylistFilter("");
            setSearch("");
          }}
          className="px-4 py-2 text-sm font-body border border-navy/20 hover:bg-navy/5 h-[38px]"
        >
          Clear all filters
        </button>
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm font-body border border-navy/20 hover:bg-navy/5 h-[38px]"
        >
          Refresh
        </button>
      </div>

      {view === "calendar" && (
        <div className="mb-6">
          <AppointmentCalendar
            appointments={filteredAppts.map((a) => ({
              id: a.id,
              date: a.date,
              start_time: a.start_time,
              end_time: a.end_time,
              status: a.status,
              client_name: a.client_name,
              serviceName: a.serviceName,
              stylistId: a.stylist_id,
              stylistName: a.stylistName,
              stylistColor: a.stylistColor,
            }))}
            onSelectAppointment={(id) => {
              const appt = filteredAppts.find((a) => a.id === id);
              if (appt) setSelectedAppt(appt);
            }}
          />
        </div>
      )}

      {view === "list" && loading ? (
        <p className="text-navy/40 font-body text-sm">Loading appointments...</p>
      ) : view === "list" && filteredAppts.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No appointments found.</p>
      ) : view === "list" ? (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {filteredAppts.map((appt) => (
            <div key={appt.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => lookupClient(appt.client_email)} className="font-body font-bold text-sm text-navy hover:text-rose transition-colors text-left">
                      {appt.client_name}
                    </button>
                    {(() => {
                      const stats = clientStats(appt.client_email);
                      return (
                        <>
                          {stats.visits > 1 && (
                            <span className="text-[10px] font-body bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              {stats.visits}x client
                            </span>
                          )}
                          {stats.noShows > 0 && (
                            <span className="text-[10px] font-body bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              {stats.noShows} no-show{stats.noShows > 1 ? "s" : ""}
                            </span>
                          )}
                        </>
                      );
                    })()}
                    {appt.reminder_sent && (
                      <span className="text-[10px] font-body text-green-600" title="Reminder sent">
                        ✓ reminded
                      </span>
                    )}
                  </div>
                  <p className="text-navy/50 text-xs font-body">{appt.client_email} {appt.client_phone && `| ${appt.client_phone}`}</p>
                  <p className="text-navy/60 text-sm font-body mt-1 flex items-center gap-2 flex-wrap">
                    <span>{appt.serviceName} with {appt.stylistName}</span>
                    {appt.requested_stylist === false && (
                      <span className="text-[10px] uppercase tracking-widest font-body bg-amber-100 text-amber-800 px-1.5 py-0.5">
                        Any stylist
                      </span>
                    )}
                  </p>
                  {appt.notes && <p className="text-navy/40 text-xs font-body mt-1 italic">&ldquo;{appt.notes}&rdquo;</p>}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-body text-sm">{fmtDate(appt.date, "withDay")}</p>
                  <p className="font-body text-sm">{fmtTime(appt.start_time)} – {fmtTime(appt.end_time)}</p>
                  <div className="mt-1 inline-block">
                    <Badge tone={badgeToneForStatus(appt.status)} size="sm">
                      {appt.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Edit form */}
              {editingId === appt.id && (
                <div className="mt-3 p-4 bg-cream/50 border border-navy/10 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">Date</label>
                      <input type="date" value={editFields.date} onChange={(e) => setEditFields({ ...editFields, date: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">Start</label>
                      <input type="time" value={editFields.start_time} onChange={(e) => setEditFields({ ...editFields, start_time: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">End</label>
                      <input type="time" value={editFields.end_time} onChange={(e) => setEditFields({ ...editFields, end_time: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Staff Notes</label>
                    <textarea value={editFields.staff_notes} onChange={(e) => setEditFields({ ...editFields, staff_notes: e.target.value })} rows={2} placeholder="Internal notes (not visible to client)" className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={pendingStatusId === appt.id} className="text-xs font-body bg-navy text-white px-4 py-1.5 hover:bg-navy/90 disabled:opacity-60">
                      {pendingStatusId === appt.id ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs font-body text-navy/50 hover:text-navy px-3 py-1.5">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Staff notes display */}
              {appt.staff_notes && editingId !== appt.id && (
                <p className="text-navy/50 text-xs font-body mt-2 bg-cream/50 px-3 py-1.5 border-l-2 border-gold/40">
                  Staff: {appt.staff_notes}
                </p>
              )}

              {appt.status !== "cancelled" && appt.status !== "completed" && appt.status !== "no_show" && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => editingId === appt.id ? setEditingId(null) : openEdit(appt)}
                    className="text-xs font-body text-navy border border-navy/20 px-3 py-1 hover:bg-navy/5"
                  >
                    {editingId === appt.id ? "Close Edit" : "Edit"}
                  </button>
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
                    onClick={() => setConfirmAction({ id: appt.id, status: "no_show", name: appt.client_name })}
                    disabled={pendingStatusId === appt.id}
                    className="text-xs font-body text-gray-600 border border-gray-200 px-3 py-1 hover:bg-gray-50"
                  >
                    No Show
                  </button>
                  <button
                    onClick={() => setConfirmAction({ id: appt.id, status: "cancelled", name: appt.client_name })}
                    disabled={pendingStatusId === appt.id}
                    className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteAppointment(appt.id)}
                    disabled={pendingStatusId === appt.id}
                    className="text-xs font-body text-red-700 border border-red-300 px-3 py-1 hover:bg-red-100"
                    title="Delete permanently"
                  >
                    Delete
                  </button>
                </div>
              )}

              {/* Cancelled / no-show / completed appointments get an Archive
                  button (auto-purged after 30 days) instead of the full
                  action set — they're finished, they just need filing. */}
              {(appt.status === "cancelled" || appt.status === "no_show" || appt.status === "completed") && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {appt.archived_at ? (
                    <button
                      onClick={() => unarchiveAppointment(appt.id)}
                      disabled={pendingStatusId === appt.id}
                      className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50 disabled:opacity-60"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => archiveAppointment(appt.id)}
                      disabled={pendingStatusId === appt.id}
                      className="text-xs font-body text-navy/70 border border-navy/20 px-3 py-1 hover:bg-navy/5 disabled:opacity-60"
                      title="Archive — auto-deletes after 30 days"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => deleteAppointment(appt.id)}
                    disabled={pendingStatusId === appt.id}
                    className="text-xs font-body text-red-700 border border-red-300 px-3 py-1 hover:bg-red-100 disabled:opacity-60"
                    title="Delete permanently"
                  >
                    Delete
                  </button>
                </div>
              )}
              {/* Indicator only — the deposit already covers no-show /
                  late-cancel under the new policy. Keep the card-on-file
                  line for awareness so admins know the card is on record. */}
              {appt.stripe_customer_id && (
                <p className="mt-2 text-[11px] font-body text-navy/50">
                  Card on file: {appt.card_brand ? `${appt.card_brand.toUpperCase()} •••${appt.card_last4}` : "saved"}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {/* Client history panel */}
      {clientHistoryId && clientHistory.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setClientHistoryId(null)}>
          <div className="bg-white p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg">Client History</h3>
              <button onClick={() => setClientHistoryId(null)} className="text-navy/40 hover:text-navy text-xl">&times;</button>
            </div>
            <p className="text-sm font-body text-navy/50 mb-1">{clientHistory[0]?.client_name}</p>
            <p className="text-xs font-body text-navy/40 mb-4">{clientHistoryId} &middot; {clientHistory.length} appointment{clientHistory.length !== 1 ? "s" : ""}</p>
            <div className="divide-y divide-navy/5">
              {clientHistory.map((h) => (
                <div key={h.id} className="py-2 flex justify-between">
                  <div>
                    <p className="text-sm font-body">{h.serviceName}</p>
                    <p className="text-xs font-body text-navy/40">{h.date} &middot; {formatTime(h.start_time)}</p>
                  </div>
                  <div className="self-start">
                    <Badge tone={badgeToneForStatus(h.status)} size="sm">
                      {h.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal for destructive actions */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.status === "cancelled" ? "Cancel Appointment" : "Mark as No-Show"}
          message={`Are you sure you want to ${confirmAction.status === "cancelled" ? "cancel" : "mark as no-show"} the appointment for ${confirmAction.name}? This cannot be undone.`}
          confirmLabel={confirmAction.status === "cancelled" ? "Cancel Appointment" : "Mark No-Show"}
          onConfirm={() => {
            updateStatus(confirmAction.id, confirmAction.status);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {toast ? (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}

      <NewAppointmentSheet
        open={showNewAppt}
        onClose={() => setShowNewAppt(false)}
        onCreated={() => {
          setToast({ type: "success", message: "Appointment created." });
          refresh();
        }}
      />

      <AppointmentActionsModal
        appointment={selectedAppt}
        pending={pendingStatusId !== null}
        onClose={() => setSelectedAppt(null)}
        onStatusChange={async (id, s) => {
          await modalStatusChange(id, s);
          setSelectedAppt(null);
        }}
        onDelete={async (id) => {
          await deleteAppointment(id);
          setSelectedAppt(null);
        }}
        onArchive={archiveAppointment}
        onUnarchive={unarchiveAppointment}
        onSaveEdit={async (id, fields) => {
          await saveEditFromModal(id, fields);
          setSelectedAppt(null);
        }}
      />
    </div>
  );
}
