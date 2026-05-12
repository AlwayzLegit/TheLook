"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import AnimatedSection from "./AnimatedSection";
import TurnstileField, { type TurnstileHandle } from "./TurnstileField";
import SalonHours from "./SalonHours";
import { track, identify } from "@/lib/analytics";
import { useBranding } from "./BrandingProvider";
import { telHref, mailtoHref } from "@/lib/branding";

export default function Contact() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const brand = useBranding();
  const [addrLine1, addrLine2] = (() => {
    const idx = brand.address.indexOf(",");
    return idx === -1
      ? [brand.address, ""]
      : [brand.address.slice(0, idx).trim(), brand.address.slice(idx + 1).trim()];
  })();
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    smsConsent: false,
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setServiceCategories(Object.keys(data));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, turnstileToken }),
      });

      if (res.ok) {
        identify(formData.email, { name: formData.name, has_phone: !!formData.phone });
        track("contact_submitted", {
          has_phone: !!formData.phone,
          service: formData.service || null,
          sms_consent: formData.smsConsent,
          message_length: formData.message.length,
        });
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          service: "",
          message: "",
          smsConsent: false,
        });
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        track("contact_failed", { status: res.status });
        setStatus("error");
        // Turnstile tokens are single-use. Reset the widget so a
        // retry gets a fresh token (P2-1).
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        // Error state stays sticky — if a user switched tabs or got
        // distracted, the "something went wrong" message must still
        // be visible when they come back. Success auto-dismisses (it's
        // a "we got it" ack, not actionable).
      }
    } catch {
      track("contact_failed", { status: 0, error: "network" });
      setStatus("error");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  return (
    <section id="contact" className="py-24 md:py-32 bg-white relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-[radial-gradient(circle,rgba(196,162,101,0.04)_0%,transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
              Get in Touch
            </span>
            <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
          </div>
          <h1 className="font-heading text-4xl md:text-5xl mb-6">
            Contact Us
          </h1>
          <p className="text-navy/70 font-body font-light max-w-2xl mx-auto mb-4">
            The fastest way to reach us is a phone call — we answer during salon hours and can
            usually book you within a few minutes. The form below routes to the same inbox we
            answer messages from, so use whichever feels easier.
          </p>
          <p className="text-navy/70 font-body font-light max-w-2xl mx-auto text-sm">
            Trying to cancel or reschedule an existing appointment? The fastest path is the link
            in your confirmation email, but the phone works too. For pricing or service questions,
            mention the look you have in mind (photos help) and we can suggest the right service +
            stylist combination.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-16">
          {/* Contact Form */}
          <AnimatedSection>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm text-navy/70 mb-2 font-body"
                  >
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm text-navy/70 mb-2 font-body"
                  >
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm text-navy/70 mb-2 font-body"
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="service"
                    className="block text-sm text-navy/70 mb-2 font-body"
                  >
                    Service Interested In
                  </label>
                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={(e) =>
                      setFormData({ ...formData, service: e.target.value })
                    }
                    className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
                  >
                    <option value="">Select a service</option>
                    {serviceCategories.length > 0
                      ? serviceCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      : <>
                          <option value="Haircuts">Haircuts</option>
                          <option value="Color">Color</option>
                          <option value="Styling">Styling</option>
                          <option value="Treatments">Treatments</option>
                        </>
                    }
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm text-navy/70 mb-2 font-body"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  minLength={10}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Tell us what you need so we can help — appointment question, feedback, or anything else."
                  className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors resize-none"
                />
              </div>

              {/* A2P 10DLC compliance — explicit SMS consent, unchecked by default. */}
              <div className="pt-2">
                <label htmlFor="smsConsent" className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="smsConsent"
                    name="smsConsent"
                    type="checkbox"
                    checked={formData.smsConsent}
                    onChange={(e) => setFormData({ ...formData, smsConsent: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-rose shrink-0"
                  />
                  <span className="text-xs text-navy/70 font-body leading-relaxed">
                    By checking this box, I agree to receive SMS text messages from The Look Hair Salon.
                    Message frequency varies. Message and data rates may apply.
                  </span>
                </label>
                <p className="text-xs text-navy/70 font-body mt-2 ml-7">
                  For more information, please review our{" "}
                  <a href="/privacy" className="underline hover:text-rose">Privacy Policy</a>
                  {" "}and{" "}
                  <a href="/terms" className="underline hover:text-rose">Terms of Service</a>.
                </p>
              </div>

              <button
                type="submit"
                disabled={status === "submitting" || (!!turnstileSiteKey && !turnstileToken)}
                className="bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm px-10 py-4 transition-all duration-300 font-body w-full sm:w-auto hover:shadow-[var(--shadow-rose-cta)] hover:-translate-y-0.5"
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
              </button>

              {turnstileSiteKey ? (
                <div className="pt-2">
                  <TurnstileField
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
                    onTokenChange={setTurnstileToken}
                  />
                </div>
              ) : null}

              {status === "success" && (
                <p className="text-green-600 text-sm font-body">
                  Thank you! We&apos;ll get back to you shortly.
                </p>
              )}
              {status === "error" && (
                <p className="text-red-600 text-sm font-body">
                  Something went wrong. Please try again or call us directly.
                </p>
              )}
            </form>
          </AnimatedSection>

          {/* Info & Map */}
          <AnimatedSection delay={0.2}>
            <div className="space-y-8">
              <div>
                <h3 className="font-heading text-2xl mb-4">Visit Us</h3>
                <div className="text-navy/70 font-body font-light space-y-2">
                  <p>{addrLine1}</p>
                  {addrLine2 && <p>{addrLine2}</p>}
                  <p className="text-navy/70 text-sm mt-2">
                    Free parking lot &amp; free street parking available.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-2xl mb-4">
                  Call or Text Us
                </h3>
                <div className="text-navy/70 font-body font-light space-y-3">
                  {/* Tap-target buttons are the only contact entry points —
                      the raw number / email used to render above them but
                      was redundant noise on mobile and duplicated the
                      Footer info. Buttons still carry tel: + mailto: so
                      long-press-to-copy works on iOS.*/}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={telHref(brand.phone)}
                      onClick={() => track("phone_click", { source: "contact_page" })}
                      className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-5 py-3 font-body transition-all duration-300 hover:shadow-[var(--shadow-rose-cta)] hover:-translate-y-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h2.5a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.27 1.05l-1.9 1.9a16 16 0 006.3 6.3l1.9-1.9a1 1 0 011.05-.27l3.6 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.82 21 3 14.18 3 6V5z" />
                      </svg>
                      Call Us
                    </a>
                    <a
                      href={mailtoHref(brand.email)}
                      className="inline-flex items-center gap-2 border border-navy/20 hover:border-navy text-navy/80 hover:text-navy text-[11px] tracking-[0.2em] uppercase px-5 py-3 font-body transition-all duration-300"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Us
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-2xl mb-4">Salon Hours</h3>
                {/* Pulled from /api/schedule/public so admin edits in
                    /admin/schedule flow straight into this block. */}
                <SalonHours variant="light" />
              </div>

              {/* Google Maps Embed */}
              <div className="aspect-video overflow-hidden rounded-sm">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(brand.address)}&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${brand.name} location`}
                />
              </div>
              {/* External "Open in Google Maps" link. The iframe above
                  shows the location but can't launch driving directions
                  on mobile — this link does, and gives us a tracked
                  directions_click event so the admin dashboard can see
                  how many visitors actually navigated to the salon. */}
              <div className="mt-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(brand.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("directions_click", { source: "contact_page" })}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase font-body text-rose hover:underline"
                >
                  Get directions
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
