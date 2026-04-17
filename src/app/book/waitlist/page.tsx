"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Service { id: string; name: string; category: string; }
interface Stylist { id: string; name: string; }

function WaitlistInner() {
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get("service") || "";
  const initialStylistId = searchParams.get("stylist") || "";

  const [services, setServices] = useState<Record<string, Service[]>>({});
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [stylistId, setStylistId] = useState(initialStylistId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTimeRange, setPreferredTimeRange] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/services").then((r) => r.json()).then((data) => { if (data) setServices(data); });
    fetch("/api/stylists").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setStylists(data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId, stylistId: stylistId || null,
          clientName: name, clientEmail: email, clientPhone: phone,
          preferredDate: preferredDate || null,
          preferredTimeRange: preferredTimeRange || null,
          notes,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join waitlist.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
        <div className="max-w-xl mx-auto px-6">
          <h1 className="font-heading text-4xl mb-2 text-center">Join the Waitlist</h1>
          <p className="text-navy/50 text-sm font-body text-center mb-10">
            We&apos;ll let you know the moment a slot opens up that matches what you&apos;re looking for.
          </p>

          {success ? (
            <div className="bg-white border border-navy/10 p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-heading text-2xl mb-3">You&apos;re on the list!</h2>
              <p className="text-navy/60 font-body text-sm mb-6">
                We&apos;ll email you as soon as a matching slot opens up.
              </p>
              <Link href="/" className="inline-block border border-navy/20 text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:border-navy">Return Home</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-navy/10 p-8 space-y-5">
              <div>
                <label className="block text-sm text-navy/60 mb-2 font-body">Service *</label>
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className="w-full border-b border-navy/20 bg-transparent py-2 text-navy font-body focus:outline-none focus:border-rose">
                  <option value="">Select a service</option>
                  {Object.entries(services).map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                      {items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-navy/60 mb-2 font-body">Preferred Stylist (optional)</label>
                <select value={stylistId} onChange={(e) => setStylistId(e.target.value)} className="w-full border-b border-navy/20 bg-transparent py-2 text-navy font-body focus:outline-none focus:border-rose">
                  <option value="">Any stylist</option>
                  {stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-navy/60 mb-2 font-body">Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full border-b border-navy/20 bg-transparent py-2 font-body focus:outline-none focus:border-rose" />
                </div>
                <div>
                  <label className="block text-sm text-navy/60 mb-2 font-body">Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border-b border-navy/20 bg-transparent py-2 font-body focus:outline-none focus:border-rose" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-navy/60 mb-2 font-body">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border-b border-navy/20 bg-transparent py-2 font-body focus:outline-none focus:border-rose" />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-navy/60 mb-2 font-body">Preferred Date (optional)</label>
                  <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="w-full border-b border-navy/20 bg-transparent py-2 font-body focus:outline-none focus:border-rose" />
                </div>
                <div>
                  <label className="block text-sm text-navy/60 mb-2 font-body">Preferred Time</label>
                  <select value={preferredTimeRange} onChange={(e) => setPreferredTimeRange(e.target.value)} className="w-full border-b border-navy/20 bg-transparent py-2 font-body focus:outline-none focus:border-rose">
                    <option value="">Any time</option>
                    <option value="morning">Morning (before 12pm)</option>
                    <option value="afternoon">Afternoon (12-4pm)</option>
                    <option value="evening">Evening (after 4pm)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-navy/60 mb-2 font-body">Additional Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any other details we should know..." className="w-full border-b border-navy/20 bg-transparent py-2 font-body focus:outline-none focus:border-rose resize-none" />
              </div>

              {error && <p className="text-red-600 text-sm font-body">{error}</p>}

              <button type="submit" disabled={submitting || !serviceId || !name || !email} className="w-full bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm px-10 py-4 font-body transition-all">
                {submitting ? "Adding..." : "Join Waitlist"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <WaitlistInner />
    </Suspense>
  );
}
