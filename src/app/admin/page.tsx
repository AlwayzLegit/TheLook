"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePolledAppointments } from "@/hooks/usePolledAppointments";

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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { appointments: realtimeAppts, loading, error, lastUpdate } = usePolledAppointments({
    enabled: status === "authenticated",
  });
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  // Fetch services and stylists for enrichment
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

  // Enrich appointments with service and stylist names
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const stylistMap = Object.fromEntries(stylists.map((s) => [s.id, s]));

  const enrichedAppts: EnrichedAppointment[] = realtimeAppts.map((a) => ({
    ...a,
    serviceName: serviceMap[a.service_id]?.name || "Unknown Service",
    stylistName: stylistMap[a.stylist_id]?.name || "Unknown Stylist",
  }));

  // Filter for today's appointments
  const today = new Date().toISOString().split("T")[0];
  const todayAppts = enrichedAppts
    .filter((a) => a.date === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Filter for upcoming appointments (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingAppts = enrichedAppts.filter((a) => {
    const apptDate = new Date(a.date);
    return apptDate > new Date(today) && apptDate <= nextWeek;
  })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 5);

  const confirmed = todayAppts.filter((a) => a.status === "confirmed");
  const pending = todayAppts.filter((a) => a.status === "pending");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-heading text-3xl">Dashboard</h1>
        {lastUpdate && (
          <span className="text-xs text-navy/40 font-body">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
      <p className="text-navy/50 font-body text-sm mb-8">
        Welcome back, {session?.user?.name}
      </p>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 border border-navy/10">
          <p className="text-navy/40 text-sm font-body">Today&apos;s Appointments</p>
          <p className="font-heading text-3xl mt-1">{todayAppts.length}</p>
        </div>
        <div className="bg-white p-6 border border-navy/10">
          <p className="text-navy/40 text-sm font-body">Confirmed</p>
          <p className="font-heading text-3xl mt-1 text-green-600">{confirmed.length}</p>
        </div>
        <div className="bg-white p-6 border border-navy/10">
          <p className="text-navy/40 text-sm font-body">Pending</p>
          <p className="font-heading text-3xl mt-1 text-gold">{pending.length}</p>
        </div>
        <div className="bg-white p-6 border border-navy/10">
          <p className="text-navy/40 text-sm font-body">Upcoming (7 days)</p>
          <p className="font-heading text-3xl mt-1 text-blue-600">{upcomingAppts.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Today's Schedule */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl">Today&apos;s Schedule</h2>
            <Link href="/admin/appointments" className="text-rose text-sm font-body hover:underline">
              View all &rarr;
            </Link>
          </div>

          {loading ? (
            <p className="text-navy/40 font-body text-sm">Loading appointments...</p>
          ) : error ? (
            <p className="text-red-600 font-body text-sm">{error}</p>
          ) : todayAppts.length === 0 ? (
            <p className="text-navy/40 font-body text-sm">No appointments today.</p>
          ) : (
            <div className="bg-white border border-navy/10 divide-y divide-navy/5">
              {todayAppts.map((appt) => (
                <div key={appt.id} className="px-6 py-4 flex items-center justify-between">
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
                      appt.status === "cancelled" ? "bg-red-100 text-red-700" :
                      "bg-gold/20 text-gold"
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl">Upcoming (Next 7 Days)</h2>
          </div>

          {loading ? (
            <p className="text-navy/40 font-body text-sm">Loading appointments...</p>
          ) : error ? (
            <p className="text-red-600 font-body text-sm">{error}</p>
          ) : upcomingAppts.length === 0 ? (
            <p className="text-navy/40 font-body text-sm">No upcoming appointments.</p>
          ) : (
            <div className="bg-white border border-navy/10 divide-y divide-navy/5">
              {upcomingAppts.map((appt) => (
                <div key={appt.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-body font-bold text-sm">{appt.client_name}</p>
                    <p className="text-navy/50 text-xs font-body">
                      {appt.serviceName} with {appt.stylistName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-sm">{new Date(appt.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                    <p className="font-body text-xs text-navy/60">{formatTime(appt.start_time)}</p>
                    <span className={`text-xs font-body px-2 py-0.5 ${
                      appt.status === "confirmed" ? "bg-green-100 text-green-700" :
                      appt.status === "cancelled" ? "bg-red-100 text-red-700" :
                      "bg-gold/20 text-gold"
                    }`}>
                      {appt.status}
                    </span>
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
