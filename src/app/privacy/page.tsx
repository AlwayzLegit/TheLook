import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getBranding, mailtoHref } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Privacy Policy",
    descriptionFor: (b) => `How ${b.name} collects, uses, and protects your personal information.`,
  });
}

const LAST_UPDATED = "April 2026";

export default async function PrivacyPage() {
  const brand = await getBranding();
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
            <h1 className="font-heading text-5xl md:text-6xl mb-4">Privacy Policy</h1>
            <p className="text-navy/60 text-xs tracking-wider uppercase font-body">Last updated: {LAST_UPDATED}</p>
          </div>

          <div className="bg-white border border-navy/10 p-8 md:p-10 space-y-6 font-body text-navy/75 leading-relaxed text-[15px]">
            <section>
              <p>
                {brand.name} is a trade name (&ldquo;doing business as&rdquo;) of <strong>Mjan Salon</strong>.
                Throughout this policy, &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo; refer to
                Mjan Salon, operating as {brand.name}. We respect your privacy. This policy explains what
                information we collect, how we use it, and the choices you have.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">1. Information We Collect</h2>
              <p className="mb-3">We collect information you provide directly, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Booking information:</strong> name, email, phone, service selected, stylist preference, appointment date/time, and any notes you share.</li>
                <li><strong>Contact form submissions:</strong> name, email, phone, message, and service of interest.</li>
                <li><strong>Account information (if you sign in):</strong> email and, for staff/stylist accounts, a password hash (we never store your password in plain text).</li>
                <li><strong>Client history:</strong> past appointments, stylist notes, hair formulas (for stylists only), preferences, and photos you or a stylist adds to your record.</li>
              </ul>
              <p className="mt-3">We also automatically collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Basic technical data such as IP address and user-agent (used for rate limiting and spam prevention).</li>
                <li>Cookies used for authentication sessions and to remember returning clients&#39; details when booking.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">2. How We Use Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To schedule, confirm, remind you about, and manage your appointments.</li>
                <li>To send you transactional emails such as booking confirmations, reminders, cancellations, and post-visit review requests.</li>
                <li>To respond to contact form inquiries.</li>
                <li>To improve service quality and maintain a history that helps your stylist give you consistent results.</li>
                <li>To prevent abuse (rate limiting, captcha).</li>
                <li>With your opt-in consent, to send occasional marketing emails about promotions.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">3. Sharing of Information</h2>
              <p>
                We do not sell your personal information. We share data only with trusted service providers
                that help us run the Site and salon:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Supabase</strong> — database and file storage hosting.</li>
                <li><strong>Vercel</strong> — website hosting.</li>
                <li><strong>Resend</strong> — email delivery (confirmations, reminders).</li>
                <li><strong>Twilio</strong> (optional) — SMS reminders.</li>
                <li><strong>Stripe</strong> (optional) — deposit processing for large services.</li>
                <li><strong>Cloudflare Turnstile</strong> — bot protection on forms.</li>
                <li><strong>Google Places API</strong> / <strong>Yelp Fusion API</strong> — pulls our public business rating and latest reviews for display on the Site.</li>
              </ul>
              <p className="mt-3">
                Each provider has its own privacy policy. We may also disclose information if legally required
                (e.g., subpoena) or to protect the rights, safety, or property of {brand.name}, our clients, or others.
              </p>
              <p className="mt-3 font-semibold">
                Mobile information will not be shared, sold, or conveyed to third parties or affiliates for
                marketing or promotional purposes.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">4. SMS / Text Messaging</h2>
              <p>
                When you provide your mobile number and check the SMS consent box on our contact or booking
                forms, you are opting in to receive transactional and informational text messages from
                The Look Hair Salon (such as appointment confirmations, reminders, and schedule-change
                alerts). Consent is not a condition of any purchase. Message frequency varies; message
                and data rates may apply.
              </p>
              <p className="mt-3">
                You can opt out at any time by replying <strong>STOP</strong> to any message. Reply
                <strong> HELP</strong> for assistance, or contact us using the information at the bottom
                of this policy.
              </p>
              <p className="mt-3 font-semibold">
                Mobile information will not be shared, sold, or conveyed to third parties or affiliates for
                marketing or promotional purposes.
              </p>
              <p className="mt-3">
                Mobile opt-in data and consent records are kept solely to document your subscription and
                are never transferred to third parties for their own marketing.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">5. Data Retention</h2>
              <p>
                We keep appointment and client records for as long as needed to provide continuity of service
                and to comply with business records obligations. You may request deletion of your record at any
                time (see &ldquo;Your Rights&rdquo; below).
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">6. Cookies</h2>
              <p>
                We use a minimal set of cookies:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Session cookies</strong> — to keep you signed in to the client portal or admin panel.</li>
                <li><strong>Local storage</strong> — to remember your name/email/phone so returning clients don&#39;t need to retype them.</li>
              </ul>
              <p className="mt-3">
                We do not use third-party advertising cookies or tracking pixels.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">7. Your Rights</h2>
              <p>
                You can request to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>See what information we have about you.</li>
                <li>Correct or update your information.</li>
                <li>Delete your account and associated records (note: we may retain financial/booking records required by law for a limited period).</li>
                <li>Opt out of non-transactional marketing emails at any time via the unsubscribe link.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these, email us at <a href={mailtoHref(brand.email)} className="text-rose hover:underline">{brand.email}</a> or call {brand.phone}.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">8. Security</h2>
              <p>
                We use HTTPS everywhere, industry-standard password hashing (bcrypt), and access controls on
                all admin data. No system is perfectly secure, but we take reasonable measures to protect
                your information.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">9. Children&#39;s Privacy</h2>
              <p>
                The Site is not directed to children under 13. We do not knowingly collect information from
                children under 13. A parent or guardian must book appointments on behalf of a minor.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">10. California Residents</h2>
              <p>
                California residents have specific rights under the CCPA, including the right to know what
                personal information we collect, to request deletion, and not to be discriminated against for
                exercising these rights. Submit requests using the contact information below.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. The &ldquo;Last updated&rdquo; date above reflects
                the latest revision. Continued use of the Site after a change means you accept the revised policy.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">12. Contact</h2>
              <div className="space-y-1 text-navy">
                <p>{brand.name}</p>
                <p>{brand.address}</p>
                <p>{brand.phone}</p>
                <p>{brand.email}</p>
              </div>
            </section>
          </div>

          <p className="text-center text-navy/60 text-xs font-body mt-6">
            This policy is provided for convenience and is not legal advice.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
