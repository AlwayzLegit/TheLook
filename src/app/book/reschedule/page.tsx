"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CalendarGrid from "@/components/booking/CalendarGrid";
import TimeSlots from "@/components/booking/TimeSlots";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function RescheduleInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing token. Check the link in your email.");
      setLoading(false);
      return;
    }
    fetch(`/api/reschedule?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setAppointment(data);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!date || !appointment) return;
    setSlotsLoading(true);
    fetch(`/api/availability?stylistId=${appointment.stylistId}&serviceId=${appointment.serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .finally(() => setSlotsLoading(false));
  }, [date, appointment]);

  const handleReschedule = async () => {
    if (!date || !selectedTime) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newDate: date, newStartTime: selectedTime }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess({ date, time: selectedTime });
      } else {
        setError(data.error || "Failed to reschedule.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="font-heading text-4xl mb-2 text-center">Reschedule Appointment</h1>

          {loading ? (
            <p className="text-navy/70 font-body text-sm text-center mt-10">Loading...</p>
          ) : error ? (
            <div className="mt-10 bg-white border border-red-200 p-8 text-center">
              <p className="text-red-600 font-body">{error}</p>
              <Link href="/" className="inline-block mt-4 text-navy/70 text-xs font-body underline">Return Home</Link>
            </div>
          ) : success ? (
            <div className="mt-10 bg-white border border-navy/10 p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-heading text-2xl mb-3">Rescheduled!</h2>
              <p className="text-navy/70 font-body text-sm mb-2">Your appointment is now:</p>
              <p className="font-body font-bold text-navy">{formatDate(success.date)}</p>
              <p className="font-body text-navy">{formatTime(success.time)}</p>
              <p className="text-navy/70 text-xs font-body mt-4">A confirmation email is on its way.</p>
              <Link href="/" className="inline-block mt-6 border border-navy/20 text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:border-navy">Return Home</Link>
            </div>
          ) : appointment ? (
            <>
              <p className="text-navy/70 text-sm font-body text-center mb-8">
                Hi {appointment.clientName} — pick a new date and time for your {appointment.serviceName} with {appointment.stylistName}.
              </p>

              <div className="bg-white border border-navy/10 p-6 mb-6">
                <p className="text-xs font-body text-navy/70 mb-1">Current:</p>
                <p className="font-body text-sm">{formatDate(appointment.date)} at {formatTime(appointment.startTime)}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <CalendarGrid selectedDate={date} onSelectDate={(d) => { setDate(d); setSelectedTime(null); }} />
                <TimeSlots
                  slots={slots}
                  loading={slotsLoading}
                  selectedDate={date}
                  selectedTime={selectedTime}
                  onSelectTime={setSelectedTime}
                />
              </div>

              {date && selectedTime && (
                <div className="mt-8 text-center">
                  <button onClick={handleReschedule} disabled={submitting} className="bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm px-10 py-4 font-body">
                    {submitting ? "Rescheduling..." : `Confirm ${formatTime(selectedTime)}`}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <RescheduleInner />
    </Suspense>
  );
}
