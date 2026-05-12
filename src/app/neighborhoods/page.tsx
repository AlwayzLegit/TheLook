import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBookButton from "@/components/MobileBookButton";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { getBranding } from "@/lib/branding";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 60;

interface NeighborhoodTile {
  slug: string;
  short_name: string;
  h1: string;
  hero_subtitle: string | null;
  distance_miles: number | null;
  drive_time_minutes: number | null;
}

async function fetchNeighborhoods(): Promise<NeighborhoodTile[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data } = await supabase
      .from("neighborhoods")
      .select("slug, short_name, h1, hero_subtitle, distance_miles, drive_time_minutes, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return ((data || []) as Array<NeighborhoodTile & { sort_order: number | null }>).map(
      ({ slug, short_name, h1, hero_subtitle, distance_miles, drive_time_minutes }) => ({
        slug,
        short_name,
        h1,
        hero_subtitle,
        distance_miles,
        drive_time_minutes,
      }),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Neighborhoods We Serve — Hair Salon Near Glendale",
    description:
      "The Look Hair Salon serves clients across Glendale and nearby neighborhoods including Pasadena, Burbank, Highland Park, and Studio City. Find your closest route, distance, and the services your area books most.",
    canonical: "/neighborhoods",
  });
}

export default async function NeighborhoodsIndex() {
  const [brand, neighborhoods] = await Promise.all([
    getBranding(),
    fetchNeighborhoods(),
  ]);

  const breadcrumbsLd = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Neighborhoods", url: "/neighborhoods" },
  ]);

  return (
    <>
      <Script
        id="ldjson-breadcrumb-neighborhoods-index"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <Navbar />
      <main className="pt-20 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 text-xs font-body text-navy/70">
          <Link href="/" className="hover:text-navy">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-navy/70">Neighborhoods</span>
        </div>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-3">
            Coming from outside Glendale?
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl text-navy mb-4">
            Neighborhoods We Serve
          </h1>
          <p className="font-body text-navy/75 text-base leading-relaxed max-w-3xl">
            {brand.name} is on South Central Avenue in Glendale, a few minutes from the 134 and 2
            freeways. Plenty of our regulars commute from cities adjacent to Glendale because the
            drive is shorter than they expect and the wait list around here moves faster than the
            higher-volume neighborhoods to the east and south. Pick the closest area below to see
            driving directions, the services your neighbors most often book, and answers to the
            questions we hear most from people travelling in.
          </p>
        </section>

        {neighborhoods.length > 0 ? (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
            <ul className="grid sm:grid-cols-2 gap-6">
              {neighborhoods.map((n) => (
                <li key={n.slug}>
                  <Link
                    href={`/neighborhoods/${n.slug}`}
                    className="group block border border-navy/10 hover:border-navy/30 p-6 transition-colors"
                  >
                    <p className="text-gold text-[11px] tracking-[0.3em] uppercase font-body mb-2">
                      {n.distance_miles != null && `${n.distance_miles} mi`}
                      {n.distance_miles != null && n.drive_time_minutes != null && " · "}
                      {n.drive_time_minutes != null && `~${n.drive_time_minutes} min drive`}
                    </p>
                    <h2 className="font-heading text-2xl text-navy group-hover:text-rose transition-colors mb-2">
                      {n.short_name}
                    </h2>
                    {n.hero_subtitle && (
                      <p className="font-body text-navy/70 text-sm leading-relaxed">
                        {n.hero_subtitle}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
            <p className="font-body text-navy/70 text-sm">
              Neighborhood pages are being added soon. In the meantime, see{" "}
              <Link href="/services" className="text-rose hover:underline">all our services</Link>{" "}
              or <Link href="/contact" className="text-rose hover:underline">get in touch</Link>.
            </p>
          </section>
        )}
      </main>
      <Footer />
      <MobileBookButton />
    </>
  );
}
