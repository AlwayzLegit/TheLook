import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StylistImage from "@/components/StylistImage";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { BOOKING } from "@/lib/constants";
import { normalizeSpecialties } from "@/lib/stylistSpecialties";

export const revalidate = 60;

async function getStylists() {
  if (!hasSupabaseConfig) return [];
  // Same dedupe logic as /api/stylists — drop the Any-Stylist sentinel
  // row AND any lookalike an admin accidentally re-created with the same
  // name, so customers don't end up on a dead-end "/stylists/any-stylist"
  // profile page.
  const { data } = await supabase
    .from("stylists")
    .select("*")
    .eq("active", true)
    .neq("id", BOOKING.ANY_STYLIST_ID)
    .not("name", "ilike", "any stylist")
    .order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((s: any) => ({
    ...s,
    specialties: (() => {
      try { return JSON.parse(normalizeSpecialties(s.specialties)); }
      catch { return []; }
    })(),
  }));
}

export default async function StylistsListPage() {
  const stylists = await getStylists();

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
              <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Our Team</span>
              <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
            </div>
            <h1 className="font-heading text-5xl md:text-6xl mb-5">Meet Our Stylists</h1>
            <p className="text-navy/60 font-body font-light max-w-xl mx-auto">
              Family-owned since 2011, our team brings decades of combined experience in cutting, coloring, and styling.
            </p>
          </div>

          {stylists.length === 0 ? (
            <p className="text-navy/40 text-center font-body">Our stylists are being featured here soon.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {stylists.map((s: any) => (
                <Link key={s.id} href={`/stylists/${s.slug}`} className="group block">
                  <div className="aspect-[3/4] overflow-hidden bg-navy/5 mb-4">
                    <StylistImage
                      src={s.image_url}
                      alt={s.name}
                      initial={s.name.charAt(0).toUpperCase()}
                      initialClass="font-heading text-6xl text-navy/20"
                      className="group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h2 className="font-heading text-2xl group-hover:text-rose transition-colors">{s.name}</h2>
                  {s.specialties.length > 0 && (
                    <p className="text-xs font-body text-navy/50 mt-2">
                      {s.specialties.slice(0, 3).join(" · ")}
                    </p>
                  )}
                  {s.bio && <p className="text-navy/50 text-sm font-body mt-3 line-clamp-2">{s.bio}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
