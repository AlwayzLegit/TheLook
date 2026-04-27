"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePolledAppointments } from "@/hooks/usePolledAppointments";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { downloadIcs } from "@/lib/icsExport";
import { todayISOInLA, addDaysISOInLA } from "@/lib/datetime";
import {
  timeToMinutes,
  minutesToTime,
  formatDurationLabel,
} from "@/lib/appointmentTime";
import AppointmentCalendar from "@/components/admin/AppointmentCalendar";
import ClearHistoryModal from "@/components/admin/ClearHistoryModal";
import NewAppointmentSheet from "@/components/admin/NewAppointmentSheet";
import WalkInDialog from "@/components/admin/WalkInDialog";
import AppointmentActionsModal from "@/components/admin/AppointmentActionsModal";
import { Button } from "@/components/ui/Button";
import { Badge, badgeToneForStatus } from "@/components/ui/Badge";
import { formatTime as fmtTime, formatDate as fmtDate } from "@/lib/format";
import ReviewRequestModal from "@/components/admin/ReviewRequestModal";

interface Service {
  id: string;
  name: string;
  // Default per-line snapshots used to seed a freshly-added line on the
  // inline edit panel. Both fields can be null on legacy rows; the UI
  // coerces missing values to safe defaults at point of use.
  duration?: number | null;
  price_min?: number | null;
  active?: boolean | null;
}

interface Stylist {
  id: string;
  name: string;
  color?: string | null;
  active?: boolean | null;
}

// One row in the inline edit panel's services list. Mirrors the
// backend appointment_services row plus the cached service name for
// rendering. price_min stored in cents to match the column.
interface InlineServiceLine {
  service_id: string;
  name: string;
  price_min: number;
  duration: number;
  sort_order: number;
}

interface EnrichedAppointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  sms_consent?: boolean | null;
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
  review_request_sent_at?: string | null;
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
  const qFocus = searchParams.get("focus");
  const arrivedFromLink = !!(qStatus || qRange || qDateFrom || qDateTo || qStylistId || qOverdue || qFocus);
  const yesterdayISO = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split("T")[0];
  })();

  const [listTab, setListTab] = useState<"active" | "archived">("active");
  const [clearArchivedOpen, setClearArchivedOpen] = useState(false);
  // Review-request modal lifted to the page so both the list-row
  // action button AND the appointment detail modal can trigger it.
  const [reviewForAppt, setReviewForAppt] = useState<EnrichedAppointment | null>(null);
  // Server-side history window. "Upcoming" matches analytics' revenue window
  // when paired with "Last 90 days" so the two pages stop looking out of sync.
  const [timeRange, setTimeRange] = useState<"upcoming" | "past30" | "past90" | "all">(() => {
    if (qRange === "upcoming" || qRange === "past30" || qRange === "past90" || qRange === "all") return qRange;
    if (qOverdue) return "past90"; // overdue rows are in the past — need history pulled
    // Deep-linked from a notification bell: widen the scope so a focused
    // appointment on a past date is actually in the fetched set. Without
    // this, clicking "New booking" on an overdue row lands on an empty
    // list.
    if (qFocus) return "past90";
    return "upcoming";
  });
  // View toggle declared up-front because fromDateForFetch below needs
  // it — calendar view always pulls full history so prior months stay
  // populated when the admin navigates back.
  const [view, setView] = useState<"calendar" | "list">(arrivedFromLink ? "list" : "calendar");

  const fromDateForFetch = (() => {
    // Calendar view always pulls full history regardless of the
    // timeRange dropdown — the grid's whole point is being able to
    // navigate back through prior months and see the appointments
    // that landed there. The timeRange filter only governs the list
    // view, where "upcoming" is genuinely useful for triaging
    // pending bookings.
    if (view === "calendar") return "";
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
  const [editFields, setEditFields] = useState({
    date: "",
    start_time: "",
    end_time: "",
    staff_notes: "",
    stylist_id: "",
  });
  // The full set of services attached to the currently-edited
  // appointment, with per-line snapshotted price + duration. Replaces
  // the older totalMinutes/serviceCount cache — the inline panel now
  // edits each line so we need the full row, not just the sum.
  const [editServiceLines, setEditServiceLines] = useState<InlineServiceLine[]>([]);
  const [editAddServiceId, setEditAddServiceId] = useState<string>("");
  // Tracks whether the current End time was touched by the admin
  // after openEdit. Once flagged, automatic recomputation from
  // services/start changes stops overwriting their override.
  const [editEndOverridden, setEditEndOverridden] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; name: string } | null>(null);
  const [clientHistoryId, setClientHistoryId] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<EnrichedAppointment[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // (view state moved above fromDateForFetch — see earlier in this
  // component. Landing from a Needs-Attention link still defaults to
  // the list view via the arrivedFromLink check there.)
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  // Row-selection set for bulk actions. Cleared on filter change via
  // the effect below — stale IDs after a filter narrow are confusing.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  // Latches to "true" once we've tried to auto-open the focused appointment.
  // Without this the modal would re-open every poll tick after the user
  // closed it.
  const [focusOpened, setFocusOpened] = useState(false);

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

  // When a notification (or any deep-link with ?focus=<id>) lands here,
  // auto-open that appointment's detail modal once the polled list has
  // the row in hand. Gated on `focusOpened` so closing the modal doesn't
  // immediately re-open it on the next 15-second poll. Service/stylist
  // lookups are computed inline so this effect doesn't depend on the
  // derived maps that live below the early-return check.
  useEffect(() => {
    if (!qFocus || focusOpened) return;
    const match = realtimeAppts.find((a) => a.id === qFocus);
    if (!match) return;
    const svc = services.find((s) => s.id === match.service_id);
    const sty = stylists.find((s) => s.id === match.stylist_id);
    const enriched: EnrichedAppointment = {
      ...(match as unknown as EnrichedAppointment),
      serviceName: match.serviceName || svc?.name || "Unknown Service",
      stylistName: match.stylistName || sty?.name || "Unknown Stylist",
      stylistColor: sty?.color || null,
    };
    setSelectedAppt(enriched);
    setFocusOpened(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeAppts, qFocus, focusOpened, services, stylists]);

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
      stylist_id: appt.stylist_id || "",
    });
    setEditServiceLines([]);
    setEditAddServiceId("");
    setEditEndOverridden(false);
    // Pull the full appointment_services rows so the inline panel can
    // render each line with editable price + duration. Falls back to
    // a single line synthesised from the appointment row if the
    // mapping table is empty (legacy single-service imports).
    fetch(`/api/admin/appointments/${appt.id}/services`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          services?: Array<{
            service_id: string;
            duration: number | null;
            price_min: number | null;
            sort_order: number | null;
          }>;
        } | null) => {
          const rows = Array.isArray(data?.services) ? data!.services! : [];
          const lines: InlineServiceLine[] = rows.map((r, i) => ({
            service_id: r.service_id,
            name: services.find((s) => s.id === r.service_id)?.name || "Unknown service",
            price_min: Number.isFinite(r.price_min) ? Number(r.price_min) : 0,
            duration: Number.isFinite(r.duration) && (r.duration as number) > 0
              ? Number(r.duration)
              : 30,
            sort_order: typeof r.sort_order === "number" ? r.sort_order : i,
          }));
          if (lines.length === 0 && appt.service_id) {
            const svc = services.find((s) => s.id === appt.service_id);
            const fallbackDuration =
              timeToMinutes(appt.end_time) - timeToMinutes(appt.start_time);
            lines.push({
              service_id: appt.service_id,
              name: svc?.name || "Unknown service",
              price_min: Number.isFinite(svc?.price_min) ? Number(svc?.price_min) : 0,
              duration: fallbackDuration > 0 ? fallbackDuration : (svc?.duration ?? 30),
              sort_order: 0,
            });
          }
          setEditServiceLines(lines);
        },
      )
      .catch(() => {
        /* fall back to empty list — admin can repopulate via the picker */
      });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (editServiceLines.length === 0) {
      setToast({ type: "error", message: "Add at least one service before saving." });
      return;
    }
    // Bail if any line has bad numbers — the per-input clamp should
    // already prevent this, but a defensive check beats a 500 from the
    // backend zod schema.
    for (const line of editServiceLines) {
      if (!Number.isFinite(line.duration) || line.duration < 1) {
        setToast({ type: "error", message: `Duration for "${line.name}" must be at least 1 min.` });
        return;
      }
      if (!Number.isFinite(line.price_min) || line.price_min < 0) {
        setToast({ type: "error", message: `Price for "${line.name}" must be a non-negative number.` });
        return;
      }
    }
    const payload: Record<string, unknown> = {
      date: editFields.date,
      start_time: editFields.start_time,
      end_time: editFields.end_time,
      staff_notes: editFields.staff_notes,
      services: editServiceLines.map((l, i) => ({
        service_id: l.service_id,
        price_min: Math.round(l.price_min),
        duration: Math.round(l.duration),
        sort_order: i,
      })),
    };
    // Only send stylist_id when it's a real UUID. Sending an empty
    // string here would trip the backend schema's z.string().uuid().
    if (editFields.stylist_id) payload.stylist_id = editFields.stylist_id;
    try {
      setPendingStatusId(editingId);
      const res = await fetch(`/api/admin/appointments/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({
          type: "error",
          message: data.error || "Failed to update appointment.",
        });
        return;
      }
      setToast({ type: "success", message: "Appointment updated." });
      setEditingId(null);
      setEditServiceLines([]);
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
    fields: {
      date: string;
      start_time: string;
      end_time: string;
      staff_notes: string;
      stylist_id?: string;
    },
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
          <Button variant="secondary" size="sm" onClick={() => setShowWalkIn(true)}>
            + Walk-in
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
          <>
            <span className="text-xs font-body text-navy/50">
              Manually clear old archived bookings using the button →
            </span>
            <button
              onClick={() => setClearArchivedOpen(true)}
              className="ml-auto px-3 py-1.5 text-xs font-body border border-red-200 text-red-600 hover:bg-red-50 uppercase tracking-widest"
            >
              Clear archived
            </button>
          </>
        )}
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
          onClick={() => refresh()}
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
              requested_stylist: a.requested_stylist,
            }))}
            onSelectAppointment={(id) => {
              const appt = filteredAppts.find((a) => a.id === id);
              if (appt) setSelectedAppt(appt);
            }}
          />
        </div>
      )}

      {/* Bulk action bar — floats in only when rows are selected. Skips
          status transitions that need per-client side effects (emails,
          SMS reminders etc.) because those would fan out unpredictably
          across a 50-row batch. */}
      {view === "list" && selectedIds.size > 0 && (
        <div className="mb-4 bg-white border border-navy/20 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-body font-semibold">
            {selectedIds.size} selected
          </span>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {(["completed", "no_show", "cancelled"] as const).map((status) => (
              <button
                key={status}
                disabled={bulkSaving}
                onClick={async () => {
                  if (!confirm(`Mark ${selectedIds.size} appointment(s) as ${status.replace("_", " ")}?`)) return;
                  setBulkSaving(true);
                  try {
                    const res = await fetch("/api/admin/appointments/bulk-status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids: Array.from(selectedIds), status }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setToast({ type: "error", message: data.error || "Bulk update failed." });
                      return;
                    }
                    setToast({ type: "success", message: `${data.updated ?? 0} appointment(s) updated.` });
                    setSelectedIds(new Set());
                    refresh();
                  } finally {
                    setBulkSaving(false);
                  }
                }}
                className="text-xs font-body px-3 py-1.5 border border-navy/20 hover:bg-navy/5 disabled:opacity-50"
              >
                Mark {status.replace("_", " ")}
              </button>
            ))}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-body text-navy/60 px-2 py-1.5 hover:text-navy"
            >
              Clear
            </button>
          </div>
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
              <div className="flex items-start justify-between gap-3">
                <label
                  className="mt-1 shrink-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedIds.has(appt.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(appt.id);
                        else next.delete(appt.id);
                        return next;
                      });
                    }}
                    aria-label={`Select appointment for ${appt.client_name}`}
                  />
                </label>
                <div className="flex-1 min-w-0">
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
              {editingId === appt.id && (() => {
                const totalDuration = editServiceLines.reduce((sum, l) => sum + (l.duration || 0), 0);
                const totalPriceCents = editServiceLines.reduce((sum, l) => sum + (l.price_min || 0), 0);
                // Services that aren't already on the appointment, so
                // the "Add service" dropdown only offers genuinely new
                // line items.
                const availableServices = services.filter(
                  (s) => s.active !== false && !editServiceLines.some((l) => l.service_id === s.id),
                );
                return (
                <div className="mt-3 p-4 bg-cream/50 border border-navy/10 space-y-3">
                  {/* Stylist */}
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1 flex items-center flex-wrap gap-2">
                      <span>Stylist</span>
                      {appt.requested_stylist === false && (
                        <span className="text-[10px] font-body text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded normal-case tracking-normal">
                          Booked as Any — pick who actually does the service
                        </span>
                      )}
                    </label>
                    <select
                      value={editFields.stylist_id}
                      onChange={(e) => setEditFields({ ...editFields, stylist_id: e.target.value })}
                      className="border border-navy/20 px-2 py-1.5 text-sm font-body bg-white w-full sm:w-auto"
                    >
                      {!stylists.some((s) => s.id === editFields.stylist_id) && editFields.stylist_id && (
                        <option value={editFields.stylist_id}>{appt.stylistName} (current)</option>
                      )}
                      {stylists
                        .filter((s) => s.active !== false)
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Date / Start / End */}
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">Date</label>
                      <input type="date" value={editFields.date} onChange={(e) => setEditFields({ ...editFields, date: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">Start</label>
                      <input
                        type="time"
                        value={editFields.start_time}
                        onChange={(e) => {
                          const next = e.target.value;
                          // Auto-shift End by the live total-duration of
                          // the editServiceLines so a single Start edit
                          // keeps the slot length intact. We skip the
                          // recompute once the admin has manually edited
                          // End — they signalled an intentional override.
                          setEditFields((f) => {
                            if (!editEndOverridden && totalDuration > 0 && next) {
                              return {
                                ...f,
                                start_time: next,
                                end_time: minutesToTime(timeToMinutes(next) + totalDuration),
                              };
                            }
                            return { ...f, start_time: next };
                          });
                        }}
                        className="border border-navy/20 px-2 py-1.5 text-sm font-body"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">End</label>
                      <input
                        type="time"
                        value={editFields.end_time}
                        onChange={(e) => {
                          setEditEndOverridden(true);
                          setEditFields({ ...editFields, end_time: e.target.value });
                        }}
                        className="border border-navy/20 px-2 py-1.5 text-sm font-body"
                      />
                    </div>
                  </div>
                  {totalDuration > 0 && !editEndOverridden && (
                    <p className="text-[11px] font-body text-navy/50 -mt-1">
                      Auto-set from {editServiceLines.length} service{editServiceLines.length === 1 ? "" : "s"} ·{" "}
                      {formatDurationLabel(totalDuration)} total. Edit End to override.
                    </p>
                  )}
                  {totalDuration > 0 && editEndOverridden && (
                    <p className="text-[11px] font-body text-navy/50 -mt-1">
                      End time manually overridden ({formatDurationLabel(totalDuration)} of services).
                    </p>
                  )}

                  {/* Services list */}
                  <div className="space-y-2">
                    <label className="block text-xs font-body text-navy/40">Services</label>
                    {editServiceLines.length === 0 && (
                      <p className="text-[11px] font-body text-amber-700 bg-amber-50 px-2 py-1.5 border border-amber-200">
                        No services on this appointment yet. Add at least one before saving.
                      </p>
                    )}
                    {editServiceLines.map((line, idx) => (
                      <div key={`${line.service_id}-${idx}`} className="flex flex-wrap items-end gap-2 bg-white border border-navy/10 px-3 py-2">
                        <div className="flex-1 min-w-[180px]">
                          <p className="text-sm font-body text-navy">{line.name}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-body text-navy/40 mb-0.5">Price ($)</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={Math.round(line.price_min / 100)}
                            onChange={(e) => {
                              const dollars = parseInt(e.target.value, 10);
                              const cents = Number.isFinite(dollars) ? Math.max(0, dollars) * 100 : 0;
                              setEditServiceLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, price_min: cents } : l)),
                              );
                            }}
                            className="w-24 border border-navy/20 px-2 py-1 text-sm font-body"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-body text-navy/40 mb-0.5">Duration (min)</label>
                          <input
                            type="number"
                            min={1}
                            step={5}
                            value={line.duration}
                            onChange={(e) => {
                              const next = parseInt(e.target.value, 10);
                              const safe = Number.isFinite(next) && next > 0 ? next : 1;
                              setEditServiceLines((prev) => {
                                const updated = prev.map((l, i) =>
                                  i === idx ? { ...l, duration: safe } : l,
                                );
                                // Recompute End from the new total duration
                                // unless admin manually overrode it.
                                if (!editEndOverridden && editFields.start_time) {
                                  const newTotal = updated.reduce((sum, l) => sum + (l.duration || 0), 0);
                                  if (newTotal > 0) {
                                    setEditFields((f) => ({
                                      ...f,
                                      end_time: minutesToTime(timeToMinutes(f.start_time) + newTotal),
                                    }));
                                  }
                                }
                                return updated;
                              });
                            }}
                            className="w-20 border border-navy/20 px-2 py-1 text-sm font-body"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditServiceLines((prev) => {
                              const updated = prev.filter((_, i) => i !== idx);
                              if (!editEndOverridden && editFields.start_time) {
                                const newTotal = updated.reduce((sum, l) => sum + (l.duration || 0), 0);
                                setEditFields((f) => ({
                                  ...f,
                                  end_time: newTotal > 0
                                    ? minutesToTime(timeToMinutes(f.start_time) + newTotal)
                                    : f.end_time,
                                }));
                              }
                              return updated;
                            });
                          }}
                          className="text-xs font-body text-red-600 border border-red-200 px-2 py-1 hover:bg-red-50"
                          aria-label={`Remove ${line.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {availableServices.length > 0 && (
                      <div className="flex flex-wrap items-end gap-2">
                        <select
                          value={editAddServiceId}
                          onChange={(e) => setEditAddServiceId(e.target.value)}
                          className="border border-navy/20 px-2 py-1.5 text-sm font-body bg-white"
                        >
                          <option value="">+ Add service…</option>
                          {availableServices.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!editAddServiceId}
                          onClick={() => {
                            const svc = services.find((s) => s.id === editAddServiceId);
                            if (!svc) return;
                            setEditServiceLines((prev) => {
                              const next: InlineServiceLine = {
                                service_id: svc.id,
                                name: svc.name,
                                price_min: Number.isFinite(svc.price_min) ? Number(svc.price_min) : 0,
                                duration: Number.isFinite(svc.duration) && (svc.duration as number) > 0
                                  ? Number(svc.duration)
                                  : 30,
                                sort_order: prev.length,
                              };
                              const updated = [...prev, next];
                              if (!editEndOverridden && editFields.start_time) {
                                const newTotal = updated.reduce((sum, l) => sum + (l.duration || 0), 0);
                                setEditFields((f) => ({
                                  ...f,
                                  end_time: minutesToTime(timeToMinutes(f.start_time) + newTotal),
                                }));
                              }
                              return updated;
                            });
                            setEditAddServiceId("");
                          }}
                          className="text-xs font-body text-navy border border-navy/20 px-3 py-1.5 hover:bg-navy/5 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {editServiceLines.length > 0 && (
                      <p className="text-[11px] font-body text-navy/60 pt-1">
                        Total: ${(totalPriceCents / 100).toFixed(2)} · {formatDurationLabel(totalDuration)}
                      </p>
                    )}
                  </div>

                  {/* Staff notes + save row, kept inside the same panel
                      so the inline edit reads as one cream-coloured
                      card instead of two stacked boxes. */}
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
                );
              })()}

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
                  {appt.status === "completed" && !appt.archived_at && (
                    <button
                      onClick={() => setReviewForAppt(appt)}
                      className="text-xs font-body text-gold border border-gold/40 px-3 py-1 hover:bg-gold/5"
                      title="Send a review request to this client"
                    >
                      Send review request
                    </button>
                  )}
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

      <WalkInDialog
        open={showWalkIn}
        onClose={() => setShowWalkIn(false)}
        onCreated={() => {
          setToast({ type: "success", message: "Walk-in added." });
          refresh();
        }}
      />

      <AppointmentActionsModal
        // Keep the modal bound to the freshest row from the polled list
        // so when admin clicks Mark Complete the status flips in place
        // AND the "Send review request" button (gated on status==completed)
        // appears without the user having to re-open the row.
        appointment={
          selectedAppt
            ? (enrichedAppts.find((a) => a.id === selectedAppt.id) ?? selectedAppt)
            : null
        }
        pending={pendingStatusId !== null}
        onClose={() => setSelectedAppt(null)}
        onStatusChange={async (id, s) => {
          await modalStatusChange(id, s);
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
        stylists={stylists.map((s) => ({
          id: s.id,
          name: s.name,
          active: s.active === false ? false : true,
        }))}
      />

      <ClearHistoryModal
        open={clearArchivedOpen}
        onOpenChange={setClearArchivedOpen}
        title="Clear archived appointments"
        description="Permanently delete archived bookings by date range."
        endpoint="/api/admin/appointments/archived/clear"
        onCleared={() => refresh()}
      />

      {reviewForAppt && (
        <ReviewRequestModal
          open={true}
          onOpenChange={(open) => { if (!open) setReviewForAppt(null); }}
          appointment={{
            id: reviewForAppt.id,
            client_name: reviewForAppt.client_name,
            client_email: reviewForAppt.client_email,
            client_phone: reviewForAppt.client_phone,
            sms_consent: reviewForAppt.sms_consent ?? null,
          }}
        />
      )}
    </div>
  );
}
