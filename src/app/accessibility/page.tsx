import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getBranding, mailtoHref } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Accessibility",
    description: "Our commitment to an accessible website and salon experience.",
    canonical: "/accessibility",
  });
}

export default async function AccessibilityPage() {
  const brand = await getBranding();
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
              <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">For Everyone</span>
              <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
            </div>
            <h1 className="font-heading text-5xl md:text-6xl mb-4">Accessibility</h1>
          </div>

          <div className="bg-white border border-navy/10 p-8 md:p-10 space-y-6 font-body text-navy/75 leading-relaxed text-[15px]">
            <section>
              <p className="mb-3">
                {brand.name} is committed to making our website and salon welcoming to everyone,
                including people with disabilities.
              </p>
              <p>
                We treat accessibility as part of every redesign and content update — not a
                one-time audit. Our stylists also train annually on serving clients with mobility,
                sensory, and communication differences so the in-salon experience matches the
                accessibility of the digital one.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">Website</h2>
              <p className="mb-3">
                We aim to follow the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA where practical.
                Features include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keyboard navigation support (use Tab / Shift+Tab / Enter).</li>
                <li>Proper semantic HTML with ARIA labels on interactive elements.</li>
                <li>Keyboard-accessible lightboxes (Escape to close, arrow keys to navigate).</li>
                <li>Keyboard controls on the before/after slider (left/right arrows adjust by 5%).</li>
                <li>Adjustable contrast via your browser or OS settings.</li>
                <li>Text readability at reasonable zoom levels (up to 200%).</li>
                <li>Image alt text on every gallery photo so screen readers convey the look.</li>
                <li>Color contrast ratios audited against WCAG AA for body text and interactive elements.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">Salon</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Our Glendale location is on the ground floor with a street-level entrance — no steps to navigate from the parking lot.</li>
                <li>We&#39;re happy to accommodate mobility devices, service animals, and specific sensory needs.</li>
                <li>Lower-volume music, scent-free service options, and quieter blow-dryer alternatives are available on request — please mention these at booking and we&#39;ll have everything ready when you arrive.</li>
                <li>If you need any accommodation or have a preference we should know about, please call ahead at {brand.phone} and we&#39;ll do our best.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">Booking by phone or email</h2>
              <p>
                If our online booking form is difficult to use with the assistive technology you
                rely on, we&#39;re happy to take your appointment over the phone or by email
                instead. Call {brand.phone} during business hours or message us at{" "}
                <a href={mailtoHref(brand.email)} className="text-rose hover:underline">{brand.email}</a>{" "}
                and we&#39;ll book you the same way we would in person.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">Report an Issue</h2>
              <p>
                If you encounter an accessibility barrier on our website, please let us know so we
                can fix it — we aim to acknowledge reports within two business days. Email{" "}
                <a href={mailtoHref(brand.email)} className="text-rose hover:underline">{brand.email}</a> or
                call {brand.phone} and describe the barrier (page URL, what you were trying to do,
                and which assistive technology you were using if relevant). We treat accessibility
                bugs as priority fixes alongside critical site issues.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
