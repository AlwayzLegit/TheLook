"use client";

import { useState, FormEvent } from "react";
import AnimatedSection from "./AnimatedSection";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

export default function Contact() {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
    <section id="contact" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Get in Touch
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Contact Us
          </h2>
          <div className="w-16 h-[1px] bg-rose mx-auto mb-4" />
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
                    <option value="cutting">Cutting</option>
                    <option value="styling">Styling & Blowout</option>
                    <option value="color">Color & Perms</option>
                    <option value="treatment">Hair Treatments</option>
                    <option value="keratin">Keratin Straightening</option>
                    <option value="extensions">Extensions</option>
                    <option value="threading">Threading & Waxing</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm text-navy/60 mb-2 font-body"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="bg-rose hover:bg-rose-light disabled:opacity-60 text-white tracking-widest uppercase text-sm px-10 py-4 transition-colors font-body w-full sm:w-auto"
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
              </button>

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
                <div className="text-navy/60 font-body font-light space-y-2">
                  <div className="flex justify-between">
                    <span>Monday</span>
                    <span>10 AM &ndash; 6 PM</span>
                  </div>
                  <div className="flex justify-between text-navy/45">
                    <span>Tuesday</span>
                    <span>CLOSED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wednesday</span>
                    <span>10 AM &ndash; 6 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thursday</span>
                    <span>10 AM &ndash; 6 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Friday</span>
                    <span>10 AM &ndash; 6 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>10 AM &ndash; 6 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>10 AM &ndash; 5 PM</span>
                  </div>
                </div>
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
