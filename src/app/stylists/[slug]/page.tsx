import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import type { Metadata } from "next";

export const revalidate = 60;

async function getStylist(slug: string) {
  if (!hasSupabaseConfig) return null;
  const { data } = await supabase.from("stylists").select("*").eq("slug", slug).eq("active", true).single();
  if (!data) return null;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { slug } = await params;
  const stylist = await getStylist(slug);
  if (!stylist) return { title: "Stylist Not Found" };
  return {
    title: `${stylist.name} — The Look Hair Salon`,
    description: stylist.bio || `Book with ${stylist.name} at The Look Hair Salon in Glendale, CA.`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function StylistPage({ params }: any) {
  const { slug } = await params;
  const stylist = await getStylist(slug);
  if (!stylist) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servicesByCategory: Record<string, any[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stylist.services.forEach((s: any) => {
    if (!servicesByCategory[s.category]) servicesByCategory[s.category] = [];
    servicesByCategory[s.category].push(s);
  });

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/stylists" className="text-xs text-navy/40 hover:text-navy font-body mb-6 inline-block">&larr; All Stylists</Link>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="aspect-[3/4] overflow-hidden bg-navy/5">
              {stylist.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={stylist.image_url} alt={stylist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-heading text-9xl text-navy/20">{stylist.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-[1px] bg-gold" />
                <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Stylist</span>
              </div>
              <h1 className="font-heading text-5xl md:text-6xl mb-4">{stylist.name}</h1>

              <div className="flex flex-wrap gap-2 mb-6">
                {stylist.specialties.map((s: string) => (
                  <span key={s} className="text-xs font-body bg-gold/15 text-gold px-3 py-1">{s}</span>
                ))}
              </div>

              {stylist.bio && (
                <p className="text-navy/70 font-body font-light leading-relaxed mb-8">{stylist.bio}</p>
              )}

              <div className="flex gap-4">
                <Link href={`/book?stylist=${stylist.id}`} className="bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 font-body transition-all">
                  Book with {stylist.name.split(" ")[0]}
                </Link>
                <a href="tel:+18186625665" className="border border-navy/20 hover:border-navy text-navy/70 hover:text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 font-body transition-all">
                  Call Us
                </a>
              </div>
            </div>
          </div>

          {Object.keys(servicesByCategory).length > 0 && (
            <div>
              <h2 className="font-heading text-3xl mb-8">Services {stylist.name.split(" ")[0]} Offers</h2>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
                {Object.entries(servicesByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <h3 className="font-heading text-xl mb-4 pb-2 border-b border-navy/10">{cat}</h3>
                    <div className="space-y-3">
                      {items.map((svc) => (
                        <div key={svc.id} className="flex items-baseline justify-between">
                          <div className="flex-1">
                            <p className="font-body text-sm">{svc.name}</p>
                            <p className="text-navy/40 text-xs font-body">{svc.duration} min</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gold font-heading">{svc.price_text}</span>
                            <Link href={`/book?service=${svc.id}&stylist=${stylist.id}`} className="text-[10px] font-body text-rose hover:underline">Book</Link>
                          </div>
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
