"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/admin/appointments?from=${today}&to=${today}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setTodayAppts(data));
  }, [status]);

  if (status !== "authenticated") return null;

  const confirmed = todayAppts.filter((a) => a.status === "confirmed");
  const pending = todayAppts.filter((a) => a.status === "pending");

  return (
    <div className="p-8">
      <h1 className="font-heading text-3xl mb-2">Dashboard</h1>
      <p className="text-navy/50 font-body text-sm mb-8">
        Welcome back, {session?.user?.name}
      </p>

      <div className="grid sm:grid-cols-3 gap-6 mb-10">
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
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl">Today&apos;s Schedule</h2>
        <Link href="/admin/appointments" className="text-rose text-sm font-body hover:underline">
          View all &rarr;
        </Link>
      </div>

      {todayAppts.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No appointments today.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {todayAppts.map((appt) => (
            <div key={appt.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-body font-bold text-sm">{appt.clientName}</p>
                <p className="text-navy/50 text-xs font-body">
                  {appt.serviceName} with {appt.stylistName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-body text-sm">{formatTime(appt.startTime)} – {formatTime(appt.endTime)}</p>
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
  );
}
