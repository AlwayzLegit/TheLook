import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — The Look Hair Salon",
  description: "Terms of service governing use of The Look Hair Salon website and booking.",
};

const LAST_UPDATED = "November 2025";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
              <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Legal</span>
              <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
            </div>
            <h1 className="font-heading text-5xl md:text-6xl mb-4">Terms of Service</h1>
            <p className="text-navy/40 text-xs tracking-wider uppercase font-body">Last updated: {LAST_UPDATED}</p>
          </div>

          <div className="bg-white border border-navy/10 p-8 md:p-10 space-y-6 font-body text-navy/75 leading-relaxed text-[15px]">
            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">1. Agreement to Terms</h2>
              <p>
                By accessing or using the website at thelookhairsalonla.com (the &ldquo;Site&rdquo;), booking
                an appointment, or using any services provided by The Look Hair Salon (&ldquo;The Look,&rdquo;
                &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service.
                If you do not agree, please do not use the Site.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">2. Appointments and Bookings</h2>
              <p className="mb-3">
                Appointments booked online are held for you based on the stylist&#39;s availability. By booking
                you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate contact information (name, email, phone).</li>
                <li>Arrive on time. Late arrivals of more than 15 minutes may be shortened or forfeited at our discretion.</li>
                <li>Notify us at least 24 hours in advance for cancellations or reschedules.</li>
                <li>Understand that pricing shown is a starting estimate; final pricing depends on hair length, density, and service complexity and will be confirmed before your appointment begins.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">3. Cancellation and No-Show Policy</h2>
              <p>
                We understand plans change. Cancellations with at least 24 hours&#39; notice are free of charge.
                Repeated late cancellations or no-shows may result in a requirement to pre-pay a deposit
                for future bookings or, in extreme cases, declining further bookings.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">4. Service Results and Consultations</h2>
              <p>
                Hair services (especially color, bleach, chemical treatments, and extensions) involve
                variability based on hair history, condition, and individual response. We always recommend
                an in-person consultation for color or chemical services. Results cannot be guaranteed
                when information about prior color, box dye, henna, or chemical treatments is withheld.
                Redos or corrections at no charge are available within 7 days at our discretion when the
                service does not match what was agreed upon during consultation.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">5. Payment</h2>
              <p>
                Payment is due at the time of service. We accept cash and all major credit and debit cards.
                Gratuity is appreciated and can be added to your tab. If a deposit is required (for large
                color services, extensions, or in cases of prior late cancellations), you will be informed
                before the appointment is confirmed.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">6. Gift Cards and Promotions</h2>
              <p>
                Gift cards are non-refundable, non-transferable, and have no cash value. Promotional
                discounts cannot be combined unless explicitly stated. Promo codes may have expiration dates
                and usage limits as noted at the time of issue.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">7. Conduct</h2>
              <p>
                We reserve the right to refuse service to anyone behaving in a disrespectful, discriminatory,
                or unsafe manner toward our stylists, staff, or other clients.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">8. Website Use</h2>
              <p>
                You agree not to use the Site to: (a) attempt to gain unauthorized access to any portion
                of the Site or its backend systems; (b) disrupt or interfere with the operation of the Site;
                (c) submit false appointment information or impersonate another person; (d) scrape, harvest,
                or otherwise collect information about other users; or (e) use the Site for any unlawful
                purpose. We may suspend or block access at our discretion.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">9. Intellectual Property</h2>
              <p>
                All content on the Site — including text, logos, photographs of our team and salon, stylist
                bios, and design — is the property of The Look Hair Salon or its licensors and is protected
                by copyright and trademark laws. You may not reproduce, distribute, or create derivative
                works without our written permission.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">10. Photos Taken at the Salon</h2>
              <p>
                We may take before/after photos during appointments for internal records. These are not
                shared publicly without your explicit consent. You can ask your stylist to delete any photo
                at any time.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">11. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, The Look Hair Salon, its owners, employees, and
                contractors will not be liable for any indirect, incidental, special, consequential, or
                punitive damages arising out of or related to your use of the Site or our services. Our
                total liability for any claim related to a service shall not exceed the amount you paid for
                that service.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">12. Disclaimers</h2>
              <p>
                The Site is provided &ldquo;as is&rdquo; without warranties of any kind. Appointment
                times, availability, and pricing may change. We make reasonable efforts to keep the Site
                accurate but do not warrant that it is error-free or uninterrupted.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">13. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date above will
                reflect the most recent version. Continued use of the Site or our services after a change
                constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">14. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of California without regard to its
                conflict of law rules. Any disputes will be resolved in the state or federal courts located
                in Los Angeles County, California.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">15. Contact Us</h2>
              <p>
                Questions about these Terms? Reach out:
              </p>
              <div className="mt-3 space-y-1 text-navy">
                <p>The Look Hair Salon</p>
                <p>919 South Central Ave Suite #E, Glendale, CA 91204</p>
                <p>(818) 662-5665</p>
                <p>look_hairsalon@yahoo.com</p>
              </div>
            </section>
          </div>

          <p className="text-center text-navy/40 text-xs font-body mt-6">
            These terms are provided for convenience and are not legal advice. For business-specific legal
            review, please consult a licensed attorney.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
