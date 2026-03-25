"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  serviceName: string;
  stylistName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  staffNotes: string | null;
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
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const loadAppts = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/admin/appointments?${params}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setAppts(data));
  };

  useEffect(() => {
    if (status === "authenticated") loadAppts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dateFrom, dateTo, statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadAppts();
  };

  if (status !== "authenticated") return null;

  return (
    <div className="p-8">
      <h1 className="font-heading text-3xl mb-6">Appointments</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body" placeholder="To" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body">
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {appts.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No appointments found.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {appts.map((appt) => (
            <div key={appt.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-body font-bold text-sm">{appt.clientName}</p>
                  <p className="text-navy/50 text-xs font-body">{appt.clientEmail} {appt.clientPhone && `| ${appt.clientPhone}`}</p>
                  <p className="text-navy/60 text-sm font-body mt-1">
                    {appt.serviceName} with {appt.stylistName}
                  </p>
                  {appt.notes && <p className="text-navy/40 text-xs font-body mt-1 italic">&ldquo;{appt.notes}&rdquo;</p>}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-body text-sm">{formatDate(appt.date)}</p>
                  <p className="font-body text-sm">{formatTime(appt.startTime)} – {formatTime(appt.endTime)}</p>
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
                    <button onClick={() => updateStatus(appt.id, "confirmed")} className="text-xs font-body text-green-600 border border-green-200 px-3 py-1 hover:bg-green-50">
                      Confirm
                    </button>
                  )}
                  <button onClick={() => updateStatus(appt.id, "completed")} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50">
                    Complete
                  </button>
                  <button onClick={() => updateStatus(appt.id, "no_show")} className="text-xs font-body text-gray-600 border border-gray-200 px-3 py-1 hover:bg-gray-50">
                    No Show
                  </button>
                  <button onClick={() => updateStatus(appt.id, "cancelled")} className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
