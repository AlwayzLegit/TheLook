"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingProgress from "@/components/booking/BookingProgress";
import ServicePicker from "@/components/booking/ServicePicker";
import StylistPicker from "@/components/booking/StylistPicker";
import DateTimePicker from "@/components/booking/DateTimePicker";
import ClientInfoForm from "@/components/booking/ClientInfoForm";
import BookingConfirmation from "@/components/booking/BookingConfirmation";
import DepositForm from "@/components/booking/DepositForm";
import { BOOKING } from "@/lib/constants";
import { track, identify } from "@/lib/analytics";

// Step layout (matches BookingProgress):
//   0  Service
//   1  Stylist     — "Any Stylist" tile at top, specific stylists below
//   2  Date & Time — shows that stylist's calendar (or union for "Any")
//   3  Your Info
//   4  Confirm
//   5  Success
const STEP_SERVICE = 0;
const STEP_STYLIST = 1;
const STEP_DATETIME = 2;
const STEP_INFO = 3;
const STEP_CONFIRM = 4;
const STEP_DONE = 5;

interface Service {
  id: string;
  category: string;
  name: string;
  priceText: string;
  priceMin?: number;
  duration: number;
  // Populated when this "service" in the picker list is actually a variant
  // (e.g. Facial Hair Removal — Brow). `id` still points to the parent
  // service so FK constraints hold; `variantId` is carried through to the
  // appointments POST.
  variantId?: string;
  variantName?: string;
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
  id?: string;
  service?: string;
  services?: { id: string; name: string }[];
  stylist: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
  anyStylist?: boolean;
}

const FALLBACK_SERVICES: Record<string, Service[]> = {
  Haircuts: [
    { id: "f-1", category: "Haircuts", name: "Wash + Cut + Style", priceText: "$80+", duration: 70 },
    { id: "f-2", category: "Haircuts", name: "Clipper Cut", priceText: "$28", duration: 25 },
    { id: "f-3", category: "Haircuts", name: "Scissor Cut", priceText: "$40", duration: 25 },
  ],
};
const FALLBACK_STYLISTS: Stylist[] = [];

export default function BookPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const searchParams = useSearchParams();

  // URL-backed step. Read ?step= once on mount to hydrate, then
  // replaceState on every transition so browser back/forward + refresh
  // land the user at the same step they were on. Valid range clamped
  // so a manually-mangled URL doesn't jump past validation gates.
  const [step, setStep] = useState<number>(() => {
    const raw = parseInt(searchParams.get("step") || "0", 10);
    if (!Number.isFinite(raw)) return STEP_SERVICE;
    return Math.max(STEP_SERVICE, Math.min(STEP_DONE, raw));
  });
  const [services, setServices] = useState<Record<string, Service[]>>({});
  const [allStylists, setAllStylists] = useState<Stylist[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | "any" | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState({ name: "", email: "", phone: "", notes: "", smsConsent: false });
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror step → URL (replaceState so we don't spam the back stack).
  // Done via direct history API instead of router.replace() to skip
  // Next's route-rerender on every forward/backward step click —
  // wizard state lives in React; URL is just a bookmark.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const current = url.searchParams.get("step");
    const target = String(step);
    if (current === target) return;
    url.searchParams.set("step", target);
    window.history.replaceState(null, "", url.toString());
  }, [step]);

  // Reset scroll to the top of the wizard on every step change.
  // Without this the browser preserves whatever scroll position the
  // previous step left the page in — e.g. picking a stylist near
  // the bottom of a long stylist grid then auto-advancing to
  // date/time would leave the user stranded below the new step's
  // content, looking at empty space. Scroll-to-top is wrapped in
  // an rAF so the new step's DOM has painted before we measure.
  useEffect(() => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [step]);

  // Listen for back/forward so the step state follows the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const raw = parseInt(new URL(window.location.href).searchParams.get("step") || "0", 10);
      if (Number.isFinite(raw)) setStep(Math.max(STEP_SERVICE, Math.min(STEP_DONE, raw)));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Forward-navigation guard — if the user deep-links to step=3 but
  // hasn't picked services yet, bounce them back to whichever earlier
  // step they skipped. Checks run in REVERSE order of requirement so
  // the user always lands on the earliest missing step.
  useEffect(() => {
    if (step === STEP_SERVICE) return;
    if (selectedServices.length === 0) { setStep(STEP_SERVICE); return; }
    if (step >= STEP_DATETIME && !selectedStylist) { setStep(STEP_STYLIST); return; }
    if (step >= STEP_INFO && (!selectedDate || !selectedTime)) { setStep(STEP_DATETIME); return; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // When the stylist changes, drop the previously-picked time — the new
  // stylist's calendar is different, and a slot that was free for Janet
  // may be taken for Armen. We intentionally KEEP selectedDate so the
  // user can compare stylists on the same day with one click.
  useEffect(() => {
    setSelectedTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStylist]);

  // DEF-019: stale submit errors linger across Back + change-selection.
  // Whenever anything upstream of Confirm changes, drop the error so the
  // user doesn't see "Invalid UUID" after fixing the real problem.
  useEffect(() => {
    setError(null);
  }, [selectedServices, selectedStylist, selectedDate, selectedTime, clientInfo]);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<{ code: string; description: string; discountAmount: number; finalPrice: number } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  // Stripe deposit (PaymentIntent id captured here once paid). Only used
  // when requiresDeposit is true — sub-threshold bookings skip card
  // collection entirely.
  const [depositPaymentIntent, setDepositPaymentIntent] = useState<string | null>(null);

  const totalPriceMin = selectedServices.reduce((sum, s) => sum + (s.priceMin || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
  const anyPricePlus = selectedServices.some((s) => s.priceText.includes("+"));

  // Deposit rules are DB-driven (admin → Settings → Booking). Fetch once
  // on mount and recompute the required deposit whenever the client's
  // cart changes. Falls back to "no deposit" if the endpoint is down so
  // bookings don't block on the rules fetch — the server runs the same
  // check authoritatively before the appointment is created.
  type DepositRuleLite = {
    id: string;
    trigger_type: "min_price_cents" | "min_duration_minutes";
    trigger_value: number;
    deposit_cents: number;
  };
  const [depositRules, setDepositRules] = useState<DepositRuleLite[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/deposits/rules")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        setDepositRules(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const { requiresDeposit, depositAmountCents } = (() => {
    let max = 0;
    for (const r of depositRules) {
      const matches =
        r.trigger_type === "min_price_cents"
          ? totalPriceMin >= r.trigger_value
          : totalDuration >= r.trigger_value;
      if (matches && r.deposit_cents > max) max = r.deposit_cents;
    }
    return { requiresDeposit: max > 0, depositAmountCents: max };
  })();

  const serviceKey = (s: Service) => (s.variantId ? `${s.id}:${s.variantId}` : s.id);

  const toggleService = (service: Service) => {
    setSelectedServices((prev) => {
      const key = serviceKey(service);
      const exists = prev.find((s) => serviceKey(s) === key);
      if (exists) return prev.filter((s) => serviceKey(s) !== key);
      return [...prev, service];
    });
    // Service change invalidates downstream selections.
    setSelectedStylist(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setDiscountResult(null);
    setDiscountError("");
    setDepositPaymentIntent(null);
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

  // Warn before leaving only when the customer has actually started filling
  // out the form — otherwise even loading the booking page bounces them with
  // a confusing "Leave site?" dialog (#18).
  useEffect(() => {
    const dirty =
      step !== STEP_DONE && (
        selectedServices.length > 0 ||
        !!selectedDate ||
        !!selectedTime ||
        !!selectedStylist ||
        !!clientInfo.name ||
        !!clientInfo.email ||
        !!clientInfo.phone ||
        !!clientInfo.notes
      );
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step, selectedServices, selectedDate, selectedTime, selectedStylist, clientInfo]);

  // Auto-fill returning customer info from localStorage; query params (used
  // by the "New Appointment for this Client" button in admin) win over it.
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
    const qpEmail = searchParams?.get("email");
    const qpName = searchParams?.get("name");
    const qpPhone = searchParams?.get("phone");
    if (qpEmail || qpName || qpPhone) {
      setClientInfo((prev) => ({
        ...prev,
        name: qpName || prev.name,
        email: qpEmail || prev.email,
        phone: qpPhone || prev.phone,
      }));
    }
  }, [searchParams]);

  // /book?service=<id> support — used by the home-page gallery
  // photos so clicking any photo lands the customer on booking
  // with that exact service already selected. The lookup runs
  // every time the services map changes (fires once after the
  // initial load completes) so we only preselect once we actually
  // have the catalog. No-op if the id doesn't match anything.
  useEffect(() => {
    const preId = searchParams?.get("service");
    if (!preId) return;
    const allRows = Object.values(services).flat();
    if (allRows.length === 0) return;
    const match = allRows.find((s) => s.id === preId && !s.variantId);
    if (!match) return;
    setSelectedServices((prev) => {
      // Don't double-add if the customer already toggled it (e.g.
      // they navigated back/forward).
      const already = prev.find(
        (s) => s.id === match.id && !s.variantId,
      );
      return already ? prev : [...prev, match];
    });
  }, [searchParams, services]);

  useEffect(() => {
    (async () => {
      try {
        // B-08: single batched call. The endpoint returns each service with
        // its variants embedded — no fan-out per service id.
        const r = await fetch("/api/services?include=variants");
        const data = await r.json();
        if (!data || Object.keys(data).length === 0) {
          setServices(FALLBACK_SERVICES);
          return;
        }

        const expandedByCat: Record<string, Service[]> = {};
        for (const cat of Object.keys(data)) {
          const rows: Service[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const s of data[cat] as any[]) {
            const base: Service = {
              id: s.id,
              category: s.category,
              name: s.name,
              priceText: s.priceText ?? s.price_text ?? "",
              priceMin: s.priceMin ?? s.price_min,
              duration: s.duration,
            };
            const variants = Array.isArray(s.variants) ? s.variants : [];
            if (variants.length === 0) {
              rows.push(base);
              continue;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const v of variants as any[]) {
              rows.push({
                id: s.id,
                category: s.category,
                name: `${s.name} — ${v.name}`,
                priceText: v.price_text,
                priceMin: v.price_min,
                duration: v.duration,
                variantId: v.id,
                variantName: v.name,
              });
            }
          }
          expandedByCat[cat] = rows;
        }

        setServices(expandedByCat);
      } catch {
        setServices(FALLBACK_SERVICES);
      }
    })();

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

  const isAny = selectedStylist === "any";
  const stylistObject = isAny ? null : (selectedStylist as Stylist | null);
  // For availability lookup before stylist is picked, use "any".
  const availabilityStylistId = stylistObject ? stylistObject.id : "any";

  const canProceed = (): boolean => {
    switch (step) {
      case STEP_SERVICE: return selectedServices.length > 0;
      case STEP_STYLIST: return !!selectedStylist;
      case STEP_DATETIME: return !!selectedDate && !!selectedTime;
      case STEP_INFO:
        return (
          !!clientInfo.name &&
          !!clientInfo.email &&
          !!clientInfo.phone &&
          clientInfo.phone.replace(/\D/g, "").length >= 7 &&
          policyAccepted &&
          (!turnstileSiteKey || !!turnstileToken)
        );
      default: return false;
    }
  };

  const nextStep = () => {
    if (step === STEP_SERVICE) setStep(STEP_STYLIST);
    else if (step === STEP_STYLIST) setStep(STEP_DATETIME);
    else if (step === STEP_DATETIME) setStep(STEP_INFO);
    else if (step === STEP_INFO) setStep(STEP_CONFIRM);
  };

  // PostHog funnel — emit one event per step the user reaches. Anonymous
  // until booking succeeds, at which point we identify() on the email so
  // return visits stitch onto the same person timeline.
  useEffect(() => {
    const stepName =
      step === STEP_SERVICE  ? "service" :
      step === STEP_STYLIST  ? "stylist" :
      step === STEP_DATETIME ? "datetime" :
      step === STEP_INFO     ? "info" :
      step === STEP_CONFIRM  ? "confirm" :
      step === STEP_DONE     ? "done" : null;
    if (!stepName) return;
    track("booking_step_viewed", {
      step: stepName,
      service_count: selectedServices.length,
      total_price_cents: totalPriceMin,
      total_duration: totalDuration,
      requires_deposit: requiresDeposit,
    });
  }, [step, selectedServices.length, totalPriceMin, totalDuration, requiresDeposit]);

  const prevStep = () => {
    if (step > STEP_SERVICE) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || !selectedStylist || !selectedDate || !selectedTime) return;
    if (requiresDeposit && !depositPaymentIntent) {
      setError("Deposit required to confirm this booking.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServices.map((s) => s.id),
          variantIds: selectedServices.map((s) => s.variantId || ""),
          stylistId: isAny ? BOOKING.ANY_STYLIST_ID : (selectedStylist as Stylist).id,
          anyStylist: isAny,
          date: selectedDate,
          startTime: selectedTime,
          clientName: clientInfo.name,
          clientEmail: clientInfo.email,
          clientPhone: clientInfo.phone || undefined,
          notes: clientInfo.notes || undefined,
          smsConsent: clientInfo.smsConsent,
          policyAccepted,
          depositPaymentIntentId: depositPaymentIntent || undefined,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        track("booking_failed", {
          status: res.status,
          error: String(data?.error || "unknown"),
          total_price_cents: totalPriceMin,
          total_duration: totalDuration,
          requires_deposit: requiresDeposit,
        });
        setError(data.error || "Failed to book appointment");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      // Identify by email so the funnel stitches across sessions,
      // then fire the conversion event.
      identify(clientInfo.email, {
        name: clientInfo.name,
        has_phone: !!clientInfo.phone,
        sms_consent: clientInfo.smsConsent,
      });
      track("booking_submitted", {
        service_count: selectedServices.length,
        total_price_cents: totalPriceMin,
        total_duration: totalDuration,
        requires_deposit: requiresDeposit,
        deposit_amount_cents: depositAmountCents,
        deposit_paid: !!depositPaymentIntent,
        is_any_stylist: isAny,
        sms_consent: clientInfo.smsConsent,
      });
      setResult(data);
      setStep(STEP_DONE);
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

  const stylistDisplayName = isAny ? "Any available stylist" : stylistObject?.name || "";

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        {/* Screen-reader anchor — design shows the step-specific h2s,
            but every route needs a page-level h1 for assistive tech. */}
        <h1 className="sr-only">Book an appointment at The Look Hair Salon</h1>
        <div className="max-w-4xl mx-auto px-6">
          {step < STEP_DONE && <BookingProgress current={step} />}

          {step === STEP_SERVICE && (
            <ServicePicker
              services={services}
              selected={selectedServices}
              onToggle={toggleService}
              onContinue={() => { if (selectedServices.length > 0) setStep(STEP_STYLIST); }}
            />
          )}

          {step === STEP_STYLIST && selectedServices.length > 0 && (
            <StylistPicker
              stylists={allStylists}
              serviceIds={selectedServices.map((s) => s.id)}
              variantIds={selectedServices.map((s) => s.variantId || "")}
              onSelect={(s) => { setSelectedStylist(s); setStep(STEP_DATETIME); }}
              selected={selectedStylist}
            />
          )}

          {step === STEP_DATETIME && selectedServices.length > 0 && selectedStylist && (
            <DateTimePicker
              stylistId={availabilityStylistId}
              stylistName={typeof selectedStylist === "string" ? "any available stylist" : selectedStylist.name}
              serviceIds={selectedServices.map((s) => s.id)}
              variantIds={selectedServices.map((s) => s.variantId || "")}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelect={(d, t) => { setSelectedDate(d); setSelectedTime(t); }}
              onChangeStylist={() => setStep(STEP_STYLIST)}
            />
          )}

          {step === STEP_INFO && (
            <ClientInfoForm
              info={clientInfo}
              onChange={setClientInfo}
              turnstileSiteKey={turnstileSiteKey}
              onTurnstileChange={setTurnstileToken}
              policyAccepted={policyAccepted}
              onPolicyChange={setPolicyAccepted}
              requiresDeposit={requiresDeposit}
              depositAmountCents={depositAmountCents}
            />
          )}

          {step === STEP_CONFIRM && selectedServices.length > 0 && selectedStylist && selectedDate && selectedTime && (
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
                      <li key={serviceKey(s)} className="flex items-baseline justify-between gap-4">
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
                  <span className="font-body font-bold text-sm">{stylistDisplayName}</span>
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
                {requiresDeposit && (
                  <div className="border-t border-navy/10 pt-4">
                    <p className="text-navy/60 text-sm font-body mb-1">
                      Required deposit — ${depositAmountCents / 100}
                    </p>
                    <p className="text-navy/50 text-xs font-body mb-3 leading-relaxed">
                      A <strong>${depositAmountCents / 100}</strong> deposit is required
                      for this booking. It&apos;s <strong>applied to your service total</strong>
                      at the appointment. If you no-show or cancel within 24&nbsp;hours, the
                      deposit is forfeited.
                    </p>
                    {depositPaymentIntent ? (
                      <p className="text-green-700 text-sm font-body">
                        ✓ ${depositAmountCents / 100} deposit collected.
                      </p>
                    ) : clientInfo.email ? (
                      <DepositForm
                        amountCents={depositAmountCents}
                        clientEmail={clientInfo.email}
                        clientName={clientInfo.name}
                        description={selectedServices.map((s) => s.name).join(", ")}
                        onSuccess={(pid) => {
                          setDepositPaymentIntent(pid);
                          track("booking_deposit_paid", {
                            amount_cents: depositAmountCents,
                            total_price_cents: totalPriceMin,
                          });
                        }}
                      />
                    ) : (
                      <p className="text-navy/50 text-xs font-body">
                        Fill in your info to pay the deposit.
                      </p>
                    )}
                  </div>
                )}
              </div>

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
                {discountError && (
                  <p role="alert" aria-live="polite" className="text-red-500 text-xs font-body mt-1">{discountError}</p>
                )}
                {discountResult && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 text-sm font-body font-bold">{discountResult.code} applied!</p>
                    <p className="text-green-600 text-xs font-body">{discountResult.description || `Saves $${(discountResult.discountAmount / 100).toFixed(0)}`}</p>
                  </div>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-red-600 text-sm font-body mt-4 text-center"
                >
                  {error}
                </p>
              )}

              {requiresDeposit && (
                <div className="mt-5 bg-rose/5 border border-rose/30 p-3 text-xs font-body text-navy/70 leading-relaxed">
                  <p className="font-bold text-navy mb-1">Cancellation Policy</p>
                  <p>
                    Your <strong>${depositAmountCents / 100} deposit</strong> is
                    refundable if you cancel at least 24&nbsp;hours in advance. Cancellations
                    within 24&nbsp;hours of the appointment forfeit the deposit. Additional
                    cancellation or no-show fees may apply where applicable.
                  </p>
                </div>
              )}

              <p className="text-navy/60 text-xs font-body mt-4 text-center">
                After you submit, your booking will be reviewed by the salon. You&apos;ll get an email
                once it&apos;s approved.
              </p>
            </div>
          )}

          {step === STEP_DONE && result && <BookingConfirmation result={result} />}

          {step > STEP_SERVICE && step < STEP_DONE && (
            <div className="flex justify-between max-w-2xl mx-auto mt-10">
              <button
                onClick={prevStep}
                className="border border-navy/20 text-navy/60 hover:text-navy hover:border-navy/40 tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
              >
                Back
              </button>

              {step < STEP_CONFIRM ? (
                <button
                  onClick={() => canProceed() && nextStep()}
                  disabled={!canProceed()}
                  className="bg-rose hover:bg-rose-light disabled:opacity-40 disabled:cursor-not-allowed text-white tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (requiresDeposit && !depositPaymentIntent)}
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
