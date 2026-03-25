"use client";

import { useState, FormEvent } from "react";
import AnimatedSection from "./AnimatedSection";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service (e.g. Resend, Formspree)
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ name: "", email: "", phone: "", service: "", message: "" });
  };

  return (
    <section id="contact" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Get in Touch
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Book an Appointment
          </h2>
          <div className="w-16 h-[1px] bg-rose mx-auto" />
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
                    value={formData.service}
                    onChange={(e) =>
                      setFormData({ ...formData, service: e.target.value })
                    }
                    className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
                  >
                    <option value="">Select a service</option>
                    <option value="haircut">Haircuts & Styling</option>
                    <option value="color">Color & Highlights</option>
                    <option value="blowout">Blowouts</option>
                    <option value="treatment">Treatments</option>
                    <option value="bridal">Bridal & Events</option>
                    <option value="extensions">Extensions</option>
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
                className="bg-rose hover:bg-rose-light text-white tracking-widest uppercase text-sm px-10 py-4 transition-colors font-body w-full sm:w-auto"
              >
                Send Message
              </button>

              {submitted && (
                <p className="text-green-600 text-sm font-body">
                  Thank you! We&apos;ll get back to you shortly.
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
                  <p>919 South Central Avenue</p>
                  <p>Glendale, CA, USA</p>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-2xl mb-4">Contact</h3>
                <div className="text-navy/60 font-body font-light space-y-2">
                  <p>
                    <a
                      href="tel:+18185551234"
                      className="hover:text-rose transition-colors"
                    >
                      (818) 555-1234
                    </a>
                  </p>
                  <p>
                    <a
                      href="mailto:info@thelookhairsalonla.com"
                      className="hover:text-rose transition-colors"
                    >
                      info@thelookhairsalonla.com
                    </a>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-2xl mb-4">Hours</h3>
                <div className="text-navy/60 font-body font-light space-y-2">
                  <div className="flex justify-between">
                    <span>Monday &ndash; Friday</span>
                    <span>9:00 AM &ndash; 7:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>9:00 AM &ndash; 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>10:00 AM &ndash; 5:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="aspect-video bg-navy/5 flex items-center justify-center">
                <div className="text-center text-navy/30">
                  <svg
                    className="w-10 h-10 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="text-sm">Google Maps Embed</p>
                  <p className="text-xs mt-1">Add your API key to enable</p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
