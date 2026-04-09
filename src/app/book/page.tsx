"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingProgress from "@/components/booking/BookingProgress";
import ServicePicker from "@/components/booking/ServicePicker";
import StylistPicker from "@/components/booking/StylistPicker";
import DateTimePicker from "@/components/booking/DateTimePicker";
import ClientInfoForm from "@/components/booking/ClientInfoForm";
import BookingConfirmation from "@/components/booking/BookingConfirmation";

const FALLBACK_SERVICES: Record<string, Service[]> = {
  Haircuts: [
    { id: "f-1", category: "Haircuts", name: "Wash + Cut + Style", priceText: "$80+", duration: 70 },
    { id: "f-2", category: "Haircuts", name: "Clipper Cut", priceText: "$28", duration: 25 },
    { id: "f-3", category: "Haircuts", name: "Scissor Cut", priceText: "$40", duration: 25 },
  ],
  Color: [
    { id: "f-4", category: "Color", name: "Single Process Root Touch-Up", priceText: "$50+", duration: 65 },
    { id: "f-5", category: "Color", name: "Balayage (incl. toner)", priceText: "$220+", duration: 180 },
    { id: "f-6", category: "Color", name: "Full Highlights (incl. toner)", priceText: "$150+", duration: 180 },
  ],
  Styling: [
    { id: "f-7", category: "Styling", name: "Blow-Out", priceText: "$40+", duration: 40 },
    { id: "f-8", category: "Styling", name: "Formal Updo", priceText: "$90+", duration: 90 },
  ],
  Treatments: [
    { id: "f-9", category: "Treatments", name: "Keratin Straightening", priceText: "$250+", duration: 120 },
    { id: "f-10", category: "Treatments", name: "Deep Conditioning", priceText: "$30+", duration: 40 },
  ],
};

const FALLBACK_STYLISTS: Stylist[] = [
  { id: "fs-1", name: "Armen P.", bio: "17+ years, trained in Moscow", imageUrl: "/images/gallery/gallery-02.jpg", specialties: ["Coloring", "Cutting"], serviceIds: ["f-1","f-2","f-3","f-4","f-5","f-6","f-7","f-8","f-9","f-10"] },
  { id: "fs-2", name: "Kristina G.", bio: "15 years, trained in Armenia", imageUrl: "/images/gallery/gallery-03.jpg", specialties: ["Cutting", "Coloring"], serviceIds: ["f-1","f-2","f-3","f-4","f-5","f-6","f-7","f-8","f-9","f-10"] },
  { id: "fs-3", name: "Alisa (Liz) H.", bio: "30+ years experience", imageUrl: "/images/gallery/gallery-04.jpg", specialties: ["Cutting", "Coloring"], serviceIds: ["f-1","f-2","f-3","f-4","f-5","f-6","f-7","f-8","f-9","f-10"] },
];

interface Service {
  id: string;
  category: string;
  name: string;
  priceText: string;
  duration: number;
}

interface Stylist {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  specialties: string[];
  serviceIds: string[];
}

interface BookingResult {
  service: string;
  stylist: string;
  date: string;
  startTime: string;
  endTime: string;
}

export default function BookPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Record<string, Service[]>>({});
  const [allStylists, setAllStylists] = useState<Stylist[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setServices(data);
        } else {
          // Fallback services when DB isn't connected
          setServices(FALLBACK_SERVICES);
        }
      })
      .catch(() => setServices(FALLBACK_SERVICES));

    fetch("/api/stylists")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllStylists(data);
        } else {
          setAllStylists(FALLBACK_STYLISTS);
        }
      })
      .catch(() => setAllStylists(FALLBACK_STYLISTS));
  }, []);

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedService;
      case 1: return !!selectedStylist;
      case 2: return !!selectedDate && !!selectedTime;
      case 3: return !!clientInfo.name && !!clientInfo.email && (!turnstileSiteKey || !!turnstileToken);
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedStylist || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          stylistId: selectedStylist.id,
          date: selectedDate,
          startTime: selectedTime,
          clientName: clientInfo.name,
          clientEmail: clientInfo.email,
          clientPhone: clientInfo.phone || undefined,
          notes: clientInfo.notes || undefined,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to book appointment");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      setResult(data);
      setStep(5);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatDate = (date: string) =>
    new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
        <div className="max-w-4xl mx-auto px-6">
          {step < 5 && <BookingProgress current={step} />}

          {/* Step 0: Service */}
          {step === 0 && (
            <ServicePicker services={services} onSelect={(s) => { setSelectedService(s); setStep(1); }} selected={selectedService} />
          )}

          {/* Step 1: Stylist */}
          {step === 1 && selectedService && (
            <StylistPicker stylists={allStylists} serviceId={selectedService.id} onSelect={(s) => { setSelectedStylist(s); setStep(2); }} selected={selectedStylist} />
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && selectedStylist && selectedService && (
            <DateTimePicker
              stylistId={selectedStylist.id}
              serviceId={selectedService.id}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelect={(d, t) => { setSelectedDate(d); setSelectedTime(t); }}
            />
          )}

          {/* Step 3: Client Info */}
          {step === 3 && (
            <ClientInfoForm
              info={clientInfo}
              onChange={setClientInfo}
              turnstileSiteKey={turnstileSiteKey}
              onTurnstileChange={setTurnstileToken}
            />
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && selectedService && selectedStylist && selectedDate && selectedTime && (
            <div className="max-w-lg mx-auto">
              <h2 className="font-heading text-3xl mb-2 text-center">Review &amp; Confirm</h2>
              <p className="text-navy/50 font-body text-sm text-center mb-8">
                Please review your appointment details
              </p>
              <div className="bg-white border border-navy/10 p-8 space-y-4">
                <div className="flex justify-between">
                  <span className="text-navy/50 text-sm font-body">Service</span>
                  <span className="font-body font-bold text-sm">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/50 text-sm font-body">Price</span>
                  <span className="text-gold font-heading">{selectedService.priceText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/50 text-sm font-body">Duration</span>
                  <span className="font-body text-sm">{selectedService.duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/50 text-sm font-body">Stylist</span>
                  <span className="font-body font-bold text-sm">{selectedStylist.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/50 text-sm font-body">Date</span>
                  <span className="font-body font-bold text-sm">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/50 text-sm font-body">Time</span>
                  <span className="font-body font-bold text-sm">{formatTime(selectedTime)}</span>
                </div>
                <div className="border-t border-navy/10 pt-4">
                  <p className="text-navy/50 text-sm font-body">{clientInfo.name}</p>
                  <p className="text-navy/50 text-sm font-body">{clientInfo.email}</p>
                  {clientInfo.phone && <p className="text-navy/50 text-sm font-body">{clientInfo.phone}</p>}
                </div>
              </div>
              {error && <p className="text-red-600 text-sm font-body mt-4 text-center">{error}</p>}
              <p className="text-navy/40 text-xs font-body mt-4 text-center">
                A $50 deposit may be required for select color/styling services. 25% cancellation fee applies for no-shows or cancellations within 24 hours.
              </p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && result && <BookingConfirmation result={result} />}

          {/* Navigation buttons */}
          {step < 5 && (
            <div className="flex justify-between max-w-2xl mx-auto mt-10">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="border border-navy/20 text-navy/60 hover:text-navy hover:border-navy/40 tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  onClick={() => canProceed() && setStep(step + 1)}
                  disabled={!canProceed()}
                  className="bg-rose hover:bg-rose-light disabled:opacity-40 disabled:cursor-not-allowed text-white tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
                >
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
