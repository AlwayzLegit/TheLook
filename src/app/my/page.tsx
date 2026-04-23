"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Appointment { id: string; service_id: string; stylist_id: string; date: string; start_time: string; end_time: string; status: string; cancel_token: string | null; services?: any; stylists?: any; }

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function PortalInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [email, setEmail] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // If we have a token in URL, exchange it for a session
      if (token) {
        const res = await fetch("/api/client-portal/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data = await res.json();
          setEmail(data.email);
          // Clean URL
          router.replace("/my");
        } else {
          router.push("/my/login");
          return;
        }
      } else {
        // Check existing session
        const res = await fetch("/api/client-portal/session");
        if (res.ok) {
          const data = await res.json();
          setEmail(data.email);
        } else {
          router.push("/my/login");
          return;
        }
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    // Get appointments for this email (public-ish via cancel token — here we're logged in)
    // We'll use a new API endpoint that returns appointments by session email
    fetch(`/api/client-portal/appointments`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, [email]);

  const signOut = async () => {
    await fetch("/api/client-portal/session", { method: "DELETE" });
    router.push("/");
  };

  if (!email) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
          <div className="text-center py-20">
            <p className="text-navy/60 font-body">Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const upcoming = appointments.filter((a) => a.date >= new Date().toISOString().split("T")[0] && a.status !== "cancelled");
  const past = appointments.filter((a) => a.date < new Date().toISOString().split("T")[0] || a.status === "cancelled" || a.status === "completed");

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-4xl">My Account</h1>
              <p className="text-navy/60 text-sm font-body mt-1">{email}</p>
            </div>
            <button onClick={signOut} className="text-xs font-body text-navy/60 hover:text-navy underline">Sign out</button>
          </div>

          {loading ? (
            <p className="text-navy/60 font-body">Loading appointments...</p>
          ) : (
            <>
              <section className="mb-10">
                <h2 className="font-heading text-2xl mb-4">Upcoming</h2>
                {upcoming.length === 0 ? (
                  <div className="bg-white border border-navy/10 p-8 text-center">
                    <p className="text-navy/60 font-body text-sm mb-4">No upcoming appointments.</p>
                    <Link href="/book" className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-6 py-2 font-body">Book Now</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((a) => (
                      <div key={a.id} className="bg-white border border-navy/10 p-5 flex items-center justify-between">
                        <div>
                          <p className="font-body font-bold">{a.services?.name || "Service"}</p>
                          <p className="text-navy/50 text-sm font-body">with {a.stylists?.name || "Your Stylist"}</p>
                          <p className="text-navy/60 text-sm font-body mt-1">{formatDate(a.date)} at {formatTime(a.start_time)}</p>
                          <span className={`inline-block mt-2 text-xs font-body px-2 py-0.5 ${a.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{a.status}</span>
                        </div>
                        {a.cancel_token && (
                          <div className="flex gap-2 shrink-0">
                            <Link href={`/book/reschedule?token=${a.cancel_token}`} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50">Reschedule</Link>
                            <Link href={`/book/cancel?token=${a.cancel_token}`} className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50">Cancel</Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="font-heading text-2xl mb-4">History</h2>
                {past.length === 0 ? (
                  <p className="text-navy/60 text-sm font-body">No past appointments.</p>
                ) : (
                  <div className="bg-white border border-navy/10 divide-y divide-navy/5">
                    {past.slice(0, 20).map((a) => (
                      <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-body text-sm">{a.services?.name || "Service"}</p>
                          <p className="text-navy/60 text-xs font-body">with {a.stylists?.name || "Stylist"} · {formatDate(a.date)}</p>
                        </div>
                        <span className={`text-xs font-body px-2 py-0.5 ${a.status === "completed" ? "bg-blue-100 text-blue-700" : a.status === "cancelled" ? "bg-red-100 text-red-700" : a.status === "no_show" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="mt-10 text-center">
                <Link href="/book" className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 font-body">Book Another Appointment</Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MyPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <PortalInner />
    </Suspense>
  );
}
