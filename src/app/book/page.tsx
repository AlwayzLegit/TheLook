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
  priceMin?: number;
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
  service?: string;
  services?: { id: string; name: string }[];
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
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<{ code: string; description: string; discountAmount: number; finalPrice: number } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [checkingDiscount, setCheckingDiscount] = useState(false);

  const totalPriceMin = selectedServices.reduce((sum, s) => sum + (s.priceMin || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
  const anyPricePlus = selectedServices.some((s) => s.priceText.includes("+"));

  const toggleService = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) return prev.filter((s) => s.id !== service.id);
      return [...prev, service];
    });
    // Changing services invalidates downstream selection
    setSelectedStylist(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setDiscountResult(null);
    setDiscountError("");
  };

  const applyDiscount = async () => {
    if (!discountCode.trim() || selectedServices.length === 0) return;
    setCheckingDiscount(true);
    setDiscountError("");
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode, servicePrice: totalPriceMin }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setDiscountResult(data);
      } else {
        setDiscountResult(null);
        setDiscountError(data.error || "Invalid code.");
      }
    } catch {
      setDiscountError("Failed to validate code.");
    } finally {
      setCheckingDiscount(false);
    }
  };

  // Warn before leaving with unsaved booking progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step > 0 && step < 5) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step]);

  // Auto-fill returning customer info from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("thelook_client");
      if (saved) {
        const parsed = JSON.parse(saved);
        setClientInfo((prev) => ({
          ...prev,
          name: parsed.name || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
        }));
      }
    } catch {}
  }, []);

  // Warn before leaving with unsaved booking progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step > 0 && step < 5) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step]);

  // Auto-fill returning customer info from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("thelook_client");
      if (saved) {
        const parsed = JSON.parse(saved);
        setClientInfo((prev) => ({
          ...prev,
          name: parsed.name || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          // Normalize snake_case fields from the API into the camelCase shape
          // this page and its child components use internally.
          const normalized: Record<string, Service[]> = {};
          for (const cat of Object.keys(data)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            normalized[cat] = (data[cat] as any[]).map((s) => ({
              id: s.id,
              category: s.category,
              name: s.name,
              priceText: s.priceText ?? s.price_text ?? "",
              priceMin: s.priceMin ?? s.price_min,
              duration: s.duration,
            }));
          }
          setServices(normalized);
        } else {
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
      case 0: return selectedServices.length > 0;
      case 1: return !!selectedStylist;
      case 2: return !!selectedDate && !!selectedTime;
      case 3: return !!clientInfo.name && !!clientInfo.email && (!turnstileSiteKey || !!turnstileToken);
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || !selectedStylist || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServices.map((s) => s.id),
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
      // Save customer info for next visit
      try {
        localStorage.setItem("thelook_client", JSON.stringify({
          name: clientInfo.name,
          email: clientInfo.email,
          phone: clientInfo.phone,
        }));
      } catch {}
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

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  };

  const hasPriceMin = selectedServices.length > 0 && selectedServices.every((s) => typeof s.priceMin === "number" && s.priceMin > 0);
  const combinedPriceText = hasPriceMin
    ? `$${Math.round(totalPriceMin / 100)}${anyPricePlus ? "+" : ""}`
    : selectedServices.map((s) => s.priceText).join(" + ");

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
        <div className="max-w-4xl mx-auto px-6">
          {step < 5 && <BookingProgress current={step} />}

          {/* Step 0: Services (multi-select) */}
          {step === 0 && (
            <ServicePicker
              services={services}
              selected={selectedServices}
              onToggle={toggleService}
              onContinue={() => { if (selectedServices.length > 0) setStep(1); }}
            />
          )}

          {/* Step 1: Stylist */}
          {step === 1 && selectedServices.length > 0 && (
            <StylistPicker
              stylists={allStylists}
              serviceIds={selectedServices.map((s) => s.id)}
              onSelect={(s) => { setSelectedStylist(s); setStep(2); }}
              selected={selectedStylist}
            />
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && selectedStylist && selectedServices.length > 0 && (
            <DateTimePicker
              stylistId={selectedStylist.id}
              serviceIds={selectedServices.map((s) => s.id)}
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
          {step === 4 && selectedServices.length > 0 && selectedStylist && selectedDate && selectedTime && (
            <div className="max-w-lg mx-auto">
              <h2 className="font-heading text-3xl mb-2 text-center">Review &amp; Confirm</h2>
              <p className="text-navy/50 font-body text-sm text-center mb-8">
                Please review your appointment details
              </p>
              <div className="bg-white border border-navy/10 p-8 space-y-4">
                <div>
                  <p className="text-navy/50 text-sm font-body mb-2">
                    {selectedServices.length === 1 ? "Service" : "Services"}
                  </p>
                  <ul className="space-y-1.5">
                    {selectedServices.map((s) => (
                      <li key={s.id} className="flex items-baseline justify-between gap-4">
                        <span className="font-body text-sm text-navy">{s.name}</span>
                        <span className="text-gold font-heading text-sm shrink-0">{s.priceText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between border-t border-navy/5 pt-3">
                  <span className="text-navy/50 text-sm font-body">Total</span>
                  <span className="text-gold font-heading">{combinedPriceText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/50 text-sm font-body">Total duration</span>
                  <span className="font-body text-sm">{formatDuration(totalDuration)}</span>
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
              {/* Discount code */}
              <div className="border-t border-navy/10 pt-4 mt-4">
                <p className="text-navy/50 text-xs font-body mb-2">Have a discount code?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountResult(null); setDiscountError(""); }}
                    placeholder="Enter code"
                    className="flex-1 border border-navy/20 px-3 py-2 text-sm font-body uppercase"
                  />
                  <button
                    type="button"
                    onClick={applyDiscount}
                    disabled={checkingDiscount || !discountCode.trim()}
                    className="px-4 py-2 bg-navy text-white text-xs font-body hover:bg-navy/90 disabled:opacity-60"
                  >
                    {checkingDiscount ? "Checking..." : "Apply"}
                  </button>
                </div>
                {discountError && <p className="text-red-500 text-xs font-body mt-1">{discountError}</p>}
                {discountResult && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 text-sm font-body font-bold">{discountResult.code} applied!</p>
                    <p className="text-green-600 text-xs font-body">{discountResult.description || `Saves $${(discountResult.discountAmount / 100).toFixed(0)}`}</p>
                  </div>
                )}
              </div>

              {error && <p className="text-red-600 text-sm font-body mt-4 text-center">{error}</p>}
              <p className="text-navy/40 text-xs font-body mt-4 text-center">
                A $50 deposit may be required for select color/styling services. 25% cancellation fee applies for no-shows or cancellations within 24 hours.
              </p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && result && <BookingConfirmation result={result} />}

          {/* Navigation buttons (step 0 uses the sticky bar inside ServicePicker) */}
          {step > 0 && step < 5 && (
            <div className="flex justify-between max-w-2xl mx-auto mt-10">
              <button
                onClick={() => setStep(step - 1)}
                className="border border-navy/20 text-navy/60 hover:text-navy hover:border-navy/40 tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
              >
                Back
              </button>

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
