import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility — The Look Hair Salon",
  description: "Our commitment to an accessible website and salon experience.",
};

export default function AccessibilityPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
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
              <p>
                The Look Hair Salon is committed to making our website and salon welcoming to everyone,
                including people with disabilities.
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
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">Salon</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Our Glendale location is on the ground floor with a street-level entrance.</li>
                <li>We&#39;re happy to accommodate mobility devices, service animals, and specific sensory needs.</li>
                <li>If you need any accommodation or have a preference we should know about, please call ahead at (818) 662-5665 and we&#39;ll do our best.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-2xl text-navy mb-3">Report an Issue</h2>
              <p>
                If you encounter an accessibility barrier on our website, please let us know so we can fix it.
                Email <a href="mailto:look_hairsalon@yahoo.com" className="text-rose hover:underline">look_hairsalon@yahoo.com</a> or
                call (818) 662-5665 and we&#39;ll respond as soon as possible.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
