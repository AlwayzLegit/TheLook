import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StylistImage from "@/components/StylistImage";
import StylistPortfolio from "@/components/StylistPortfolio";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { BOOKING } from "@/lib/constants";
import { getBranding, telHref } from "@/lib/branding";
import { isOptimizableImageHost } from "@/lib/imageHosts";
import { personJsonLd } from "@/lib/seo";
import type { Metadata } from "next";

interface PortfolioItem {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
}
interface PortfolioPair {
  id: string;
  before_url: string;
  after_url: string;
  caption: string | null;
  alt: string | null;
}

async function getStylistPortfolio(
  stylistId: string,
): Promise<{ items: PortfolioItem[]; pairs: PortfolioPair[] }> {
  if (!hasSupabaseConfig) return { items: [], pairs: [] };
  try {
    const [itemsRes, pairsRes] = await Promise.all([
      supabase
        .from("gallery_items")
        .select("id, image_url, title, caption, sort_order")
        .eq("active", true)
        .eq("stylist_id", stylistId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("gallery_before_after")
        .select("id, before_url, after_url, caption, alt, sort_order")
        .eq("active", true)
        .eq("stylist_id", stylistId)
        .order("sort_order", { ascending: true }),
    ]);
    return {
      items: (itemsRes.data as PortfolioItem[]) || [],
      pairs: (pairsRes.data as PortfolioPair[]) || [],
    };
  } catch {
    // Pre-migration env (20260511 not run yet) — stylist_id column
    // doesn't exist. Surface no portfolio rather than 500 the page.
    return { items: [], pairs: [] };
  }
}

export const revalidate = 60;

// Pre-build the stylist + manager detail pages at deploy so the first
// organic-search hit doesn't pay the SSR cold-start. Keeps revalidate=60
// behavior: they're still regenerated in the background when stale.
export async function generateStaticParams() {
  if (!hasSupabaseConfig) return [];
  const out: Array<{ slug: string }> = [];
  try {
    const { data: stylists } = await supabase
      .from("stylists")
      .select("slug")
      .eq("active", true);
    for (const row of (stylists || []) as Array<{ slug: string | null }>) {
      if (row.slug) out.push({ slug: row.slug });
    }
  } catch {}
  try {
    const { data: staff } = await supabase
      .from("admin_users")
      .select("slug")
      .eq("active_for_public", true);
    for (const row of (staff || []) as Array<{ slug: string | null }>) {
      if (row.slug) out.push({ slug: row.slug });
    }
  } catch {}
  return out;
}

interface StaffRecord {
  id: string;
  name: string;
  role: string;
  title: string | null;
  bio: string | null;
  image_url: string | null;
  slug: string | null;
  active_for_public: boolean;
}

async function getStaff(slug: string): Promise<StaffRecord | null> {
  if (!hasSupabaseConfig) return null;
  try {
    const { data } = await supabase
      .from("admin_users")
      .select("id, name, role, title, bio, image_url, slug, active_for_public")
      .eq("slug", slug)
      .eq("active_for_public", true)
      .maybeSingle();
    return (data as StaffRecord | null) || null;
  } catch {
    // Pre-migration envs won't have the new columns yet.
    return null;
  }
}

async function getStylist(slug: string) {
  if (!hasSupabaseConfig) return null;
  // Never serve the "Any Stylist" sentinel or a duplicate as a real profile
  // — it's a booking-flow construct, not a person. Send the customer to the
  // stylist list instead.
  if (slug === "any" || slug === "any-stylist") return null;
  const { data } = await supabase.from("stylists").select("*").eq("slug", slug).eq("active", true).single();
  if (!data) return null;
  if (data.id === BOOKING.ANY_STYLIST_ID) return null;
  if ((data.name || "").trim().toLowerCase() === "any stylist") return null;

  // Get service mappings
  const { data: mappings } = await supabase.from("stylist_services").select("service_id").eq("stylist_id", data.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceIds = (mappings || []).map((m: any) => m.service_id);

  // Get services
  let services: unknown[] = [];
  if (serviceIds.length > 0) {
    const { data: svcs } = await supabase.from("services").select("*").eq("active", true).in("id", serviceIds).order("sort_order");
    services = svcs || [];
  }

  return {
    ...data,
    specialties: data.specialties ? JSON.parse(data.specialties) : [],
    services,
  };
}

function defaultRoleTitle(role: string): string {
  if (role === "admin") return "Owner";
  if (role === "manager") return "Salon Manager";
  return "Team";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params;
  const [staff, stylist, brand] = await Promise.all([getStaff(slug), getStylist(slug), getBranding()]);
  const person = staff || stylist;
  if (!person) return { title: "Not Found" };
  const title = `${person.name} — ${brand.name}`;
  const description = person.bio || `Meet ${person.name} at ${brand.name} in Glendale, CA.`;
  return { title, description };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function TeamMemberPage({ params }: any) {
  const { slug } = await params;
  // admin_users takes precedence — a manager and a stylist sharing the
  // same slug is unlikely, but the slug is editable from /admin/profile,
  // so an explicit owner/manager page should win over a stylist collision.
  const [staff, stylist, brand] = await Promise.all([getStaff(slug), getStylist(slug), getBranding()]);

  if (staff) {
    const staffLd = await personJsonLd({
      name: staff.name,
      jobTitle: staff.title || defaultRoleTitle(staff.role),
      bio: staff.bio,
      imageUrl: staff.image_url,
      slug: staff.slug,
    });
    return (
      <>
        <Script
          id="ldjson-person-staff"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(staffLd) }}
        />
        <Navbar />
        <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
          <div className="max-w-4xl mx-auto px-6">
            <Link href="/team" className="text-xs text-navy/70 hover:text-navy font-body mb-6 inline-block">&larr; All team</Link>

            <div className="flex flex-col items-center text-center">
              <div className="relative aspect-square overflow-hidden bg-cream-dark rounded-full w-52 md:w-64 mb-6">
                {staff.image_url ? (
                  <Image
                    src={staff.image_url}
                    alt={staff.name}
                    fill
                    sizes="(max-width: 768px) 208px, 256px"
                    className="object-cover object-center"
                    unoptimized={!isOptimizableImageHost(staff.image_url)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-heading text-6xl text-navy/25">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-[1px] bg-gold" />
                <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
                  {staff.title || defaultRoleTitle(staff.role)}
                </span>
                <span className="w-8 h-[1px] bg-gold" />
              </div>

              <h1 className="font-heading text-5xl md:text-6xl mb-6">{staff.name}</h1>

              {staff.bio && (
                <p className="text-navy/70 font-body font-light leading-relaxed max-w-2xl mb-10">{staff.bio}</p>
              )}

              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/book" className="bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 font-body transition-all">
                  Book an appointment
                </Link>
                <a href={telHref(brand.phone)} className="border border-navy/20 hover:border-navy text-navy/70 hover:text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 font-body transition-all">
                  Call us
                </a>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!stylist) notFound();

  const portfolio = await getStylistPortfolio(stylist.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servicesByCategory: Record<string, any[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stylist.services.forEach((s: any) => {
    if (!servicesByCategory[s.category]) servicesByCategory[s.category] = [];
    servicesByCategory[s.category].push(s);
  });

  const stylistLd = await personJsonLd({
    name: stylist.name,
    jobTitle: "Hair Stylist",
    bio: stylist.bio,
    imageUrl: stylist.image_url,
    slug: stylist.slug,
    knowsAbout: Array.isArray(stylist.specialties) ? stylist.specialties : [],
  });

  return (
    <>
      <Script
        id="ldjson-person-stylist"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(stylistLd) }}
      />
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/team" className="text-xs text-navy/70 hover:text-navy font-body mb-6 inline-block">&larr; All team</Link>

          <div className="grid md:grid-cols-2 gap-12 mb-16 items-center">
            <div className="relative aspect-square overflow-hidden bg-cream-dark rounded-full w-64 md:w-80 mx-auto">
              <StylistImage
                src={stylist.image_url}
                alt={stylist.name}
                initial={stylist.name.charAt(0).toUpperCase()}
                sizes="(max-width: 768px) 256px, 320px"
              />
            </div>
            <div className="flex flex-col justify-center text-center md:text-left">
              <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                <span className="w-8 h-[1px] bg-gold" />
                <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Stylist</span>
              </div>
              <h1 className="font-heading text-5xl md:text-6xl mb-4">{stylist.name}</h1>

              {stylist.specialties.length > 0 && (
                <p className="text-sm font-body text-navy/70 mb-6">
                  {stylist.specialties.join(" · ")}
                </p>
              )}

              {stylist.bio && (
                <p className="text-navy/70 font-body font-light leading-relaxed mb-8">{stylist.bio}</p>
              )}

              <div className="flex gap-4 justify-center md:justify-start">
                <Link href={`/book?stylist=${stylist.id}`} className="bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 font-body transition-all">
                  Book with {stylist.name.split(" ")[0]}
                </Link>
                <a href={telHref(brand.phone)} className="border border-navy/20 hover:border-navy text-navy/70 hover:text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 font-body transition-all">
                  Call Us
                </a>
              </div>
            </div>
          </div>

          <StylistPortfolio
            stylistName={stylist.name}
            stylistSlug={stylist.slug}
            items={portfolio.items}
            pairs={portfolio.pairs}
          />

          {Object.keys(servicesByCategory).length > 0 && (
            <div>
              <h2 className="font-heading text-3xl mb-8">Services {stylist.name.split(" ")[0]} Offers</h2>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
                {Object.entries(servicesByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <h3 className="font-heading text-xl mb-4 pb-2 border-b border-navy/10">{cat}</h3>
                    <div className="space-y-3">
                      {items.map((svc) => (
                        // Fixed-column grid so price + Book link line up
                        // neatly across every row, regardless of service
                        // name length.
                        <div key={svc.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-baseline">
                          <div>
                            <p className="font-body text-sm">{svc.name}</p>
                            <p className="text-navy/70 text-xs font-body">{svc.duration} min</p>
                          </div>
                          <span className="text-gold font-heading text-right tabular-nums min-w-[70px]">{svc.price_text}</span>
                          <Link href={`/book?service=${svc.id}&stylist=${stylist.id}`} className="text-[10px] font-body text-rose hover:underline">Book</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
