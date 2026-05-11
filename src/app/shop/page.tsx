import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { pageMetadata } from "@/lib/seo";
import { getBranding } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Shop & Product Recommendations",
    descriptionFor: (b) =>
      `Professional haircare product recommendations from ${b.name}'s stylists in Glendale, CA. Get a personalized routine for your hair type at your next appointment.`,
    canonical: "/shop",
  });
}

export default async function ShopPage() {
  const brand = await getBranding();
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <header className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
              <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
                Product Recommendations
              </span>
              <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
            </div>

            <h1 className="font-heading text-4xl md:text-5xl text-navy mb-6">
              Shop &amp; Product Recommendations
            </h1>
            <p className="text-navy/70 font-body font-light text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Our online product store is being curated. In the meantime, every
              appointment at {brand.name} includes a personalized product
              recommendation from your stylist — the same professional-grade
              shampoos, conditioners, and treatments we use on you in the
              salon, matched to your specific hair type and goals.
            </p>
          </header>

          <section className="space-y-6 text-navy/80 font-body text-base leading-relaxed">
            <h2 className="font-heading text-2xl md:text-3xl text-navy mt-12 mb-4">
              Why professional haircare matters
            </h2>
            <p>
              Drugstore products are formulated for the broadest possible audience,
              which means the active ingredients are diluted and the wrong fit for
              most specific concerns. Professional-grade products use higher
              concentrations of conditioning agents, color-protecting molecules,
              and bond-builders, and are formulated for narrower hair types — fine,
              coarse, color-treated, curly, chemically-relaxed, or scalp-sensitive.
              That precision is what makes the same shampoo feel completely
              different on two different heads.
            </p>
            <p>
              Our stylists train in product chemistry alongside cutting and color.
              Every recommendation we make is tied to what we just observed in your
              hair during your service — porosity, density, current condition,
              chemical history, lifestyle (heat tools, sun exposure, swimming) —
              not a generic shelf pick.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl text-navy mt-12 mb-4">
              What we&apos;re curating
            </h2>
            <p>
              The online shop will launch with the core categories our clients ask
              about most:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-navy">Color-care shampoo &amp; conditioner</strong> —
                sulfate-free formulas that extend the life of your color service
                between appointments.
              </li>
              <li>
                <strong className="text-navy">Bond-building treatments</strong> — at-home
                versions of the in-salon B3 Intensive Repair we use during
                lightening services, to keep hair structure intact between visits.
              </li>
              <li>
                <strong className="text-navy">Heat protectants &amp; styling tools</strong> —
                if you use a flat iron or curling iron at home, the right
                pre-styling product makes a measurable difference in long-term hair
                health.
              </li>
              <li>
                <strong className="text-navy">Scalp &amp; treatment masks</strong> — the
                weekly resets that keep color vibrant, frizz controlled, and the
                scalp balanced.
              </li>
              <li>
                <strong className="text-navy">Brushes &amp; styling accessories</strong> —
                the same tools your stylist uses, sized for the texture and length
                of your hair.
              </li>
            </ul>

            <h2 className="font-heading text-2xl md:text-3xl text-navy mt-12 mb-4">
              How to get a recommendation today
            </h2>
            <p>
              You don&apos;t need to wait for the online store to launch. The
              fastest way to get the right products for your hair is to mention it
              at booking — your stylist will pull the matching products from our
              salon-floor selection during the consultation, walk you through
              what each does, and you can take them home that same visit. There&apos;s
              no upsell pressure; the recommendation is part of the service.
            </p>
            <p>
              If you&apos;d rather get a recommendation before booking — say
              you&apos;re traveling and want to grab a few products on your way out
              — call or message us and we&apos;ll suggest a starter set based on a
              few quick questions about your hair.
            </p>
          </section>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
            >
              Book an Appointment
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-navy/20 text-navy hover:border-navy/50 text-xs tracking-[0.2em] uppercase font-body px-7 py-3 transition-colors"
            >
              Ask Us a Question
            </Link>
          </div>

          <div className="mt-16 pt-10 border-t border-navy/10 text-navy/70 font-body text-xs tracking-wider text-center">
            {brand.address} · {brand.phone}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
