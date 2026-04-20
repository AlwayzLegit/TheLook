"use client";

import { useState, useEffect, FormEvent } from "react";
import AnimatedSection from "./AnimatedSection";
import TurnstileField from "./TurnstileField";
import SalonHours from "./SalonHours";

export default function Contact() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

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
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          service: "",
          message: "",
        });
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
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
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Contact Us
          </h2>
          <p className="text-navy/60 font-body font-light max-w-xl mx-auto">
            The absolute best way to reach us is by calling the salon directly.
            We will be glad to assist you with any questions you may have.
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
                    className="block text-sm text-navy/60 mb-2 font-body"
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
                    className="block text-sm text-navy/60 mb-2 font-body"
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
                    className="block text-sm text-navy/60 mb-2 font-body"
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
                    className="block text-sm text-navy/60 mb-2 font-body"
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
                  className="block text-sm text-navy/60 mb-2 font-body"
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

              <button
                type="submit"
                disabled={status === "submitting" || (!!turnstileSiteKey && !turnstileToken)}
                className="bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm px-10 py-4 transition-all duration-300 font-body w-full sm:w-auto hover:shadow-[0_4px_20px_rgba(184,36,59,0.3)] hover:-translate-y-0.5"
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
              </button>

              {turnstileSiteKey ? (
                <div className="pt-2">
                  <TurnstileField
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
                <div className="text-navy/60 font-body font-light space-y-2">
                  <p>919 South Central Ave Suite #E</p>
                  <p>Glendale, CA 91204</p>
                  <p className="text-navy/50 text-sm mt-2">
                    Free parking lot &amp; free street parking available.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-2xl mb-4">
                  Call or Text Us
                </h3>
                <div className="text-navy/60 font-body font-light space-y-2">
                  <p>
                    <a
                      href="tel:+18186625665"
                      className="hover:text-rose transition-colors text-lg"
                    >
                      (818) 662-5665
                    </a>
                  </p>
                  <p>
                    <a
                      href="mailto:look_hairsalon@yahoo.com"
                      className="hover:text-rose transition-colors"
                    >
                      look_hairsalon@yahoo.com
                    </a>
                  </p>
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
                  src="https://www.google.com/maps?q=919+S+Central+Ave+Suite+E,+Glendale,+CA+91204&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="The Look Hair Salon location"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
