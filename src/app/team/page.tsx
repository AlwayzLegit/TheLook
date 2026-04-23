import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StylistImage from "@/components/StylistImage";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { BOOKING } from "@/lib/constants";
import { normalizeSpecialties } from "@/lib/stylistSpecialties";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Our Team",
    descriptionFor: (b) =>
      `Meet the management and stylists at ${b.name} in Glendale, CA. Family-owned since 2011.`,
  });
}

// Public team page. Two sections stacked top-to-bottom:
//
//   1. Management — admin_users rows where active_for_public = true,
//      sorted by sort_order. Everyone starts hidden and opts in from
//      /admin/profile. Section hides entirely when no public managers
//      exist so the page doesn't carry an empty header.
//
//   2. Stylists — the long-standing stylists grid. Links from here go
//      to /team/<slug> (renamed from /stylists/<slug>; the old URL
//      still redirects via app/stylists/[slug]/page.tsx).

export const revalidate = 60;

interface StaffProfile {
  id: string;
  name: string;
  role: string;
  title: string | null;
  bio: string | null;
  image_url: string | null;
  slug: string | null;
  sort_order: number;
}

async function getStylists() {
  if (!hasSupabaseConfig) return [];
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

async function getPublicStaff(): Promise<StaffProfile[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data } = await supabase
      .from("admin_users")
      .select("id, name, role, title, bio, image_url, slug, sort_order")
      .eq("active_for_public", true)
      .order("sort_order", { ascending: true });
    return (data || []) as StaffProfile[];
  } catch {
    // Pre-migration envs won't have the new columns yet — fail silent so
    // the stylist section still renders.
    return [];
  }
}

function defaultTitle(role: string): string {
  if (role === "admin") return "Owner";
  if (role === "manager") return "Salon Manager";
  return "Team";
}

export default async function TeamPage() {
  const [staff, stylists] = await Promise.all([getPublicStaff(), getStylists()]);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-[100dvh] bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-gold" />
              <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Our Team</span>
              <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-gold" />
            </div>
            <h1 className="font-heading text-5xl md:text-6xl mb-5">Meet Our Team</h1>
            <p className="text-navy/60 font-body font-light max-w-xl mx-auto">
              Family-owned since 2011. Below you&apos;ll meet the managers and stylists who make the salon run.
            </p>
          </div>

          {staff.length > 0 && (
            <section className="mb-20">
              <h2 className="font-heading text-2xl md:text-3xl mb-8 text-center">
                Management
              </h2>
              {/* Flex-center + wrap so 1, 2, or 3 managers all sit
                  horizontally centered on the page instead of left-
                  aligning in a 3-column grid. */}
              <div className="flex flex-wrap justify-center gap-10 md:gap-12 max-w-4xl mx-auto">
                {staff.map((s) => {
                  const body = (
                    <>
                      <div className="relative aspect-square overflow-hidden bg-cream-dark rounded-full max-w-[220px] mx-auto mb-5 group-hover:ring-2 group-hover:ring-gold/40 transition-all">
                        {s.image_url ? (
                          <Image
                            src={s.image_url}
                            alt={s.name}
                            fill
                            sizes="220px"
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            unoptimized={!/\.supabase\.co\//.test(s.image_url) && !s.image_url.includes("images.unsplash.com")}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-heading text-5xl text-navy/25">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h3 className="font-heading text-2xl group-hover:text-rose transition-colors">{s.name}</h3>
                      <p className="text-gold text-[11px] tracking-[0.2em] uppercase font-body mt-1">
                        {s.title || defaultTitle(s.role)}
                      </p>
                      {s.bio && (
                        <p className="text-navy/60 text-sm font-body mt-3 leading-relaxed max-w-xs mx-auto line-clamp-4">
                          {s.bio}
                        </p>
                      )}
                    </>
                  );
                  // Only wrap in a Link when the admin has picked a public
                  // slug from /admin/profile — the detail route needs it
                  // to look the record back up server-side.
                  return s.slug ? (
                    <Link key={s.id} href={`/team/${s.slug}`} className="group block text-center w-full sm:w-64">
                      {body}
                    </Link>
                  ) : (
                    <div key={s.id} className="group text-center w-full sm:w-64">
                      {body}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            {staff.length > 0 && (
              <h2 className="font-heading text-2xl md:text-3xl mb-8 text-center">
                Stylists
              </h2>
            )}

            {stylists.length === 0 ? (
              <p className="text-navy/60 text-center font-body">Our stylists are being featured here soon.</p>
            ) : (
              // Circular tiles match the Management section above so the
              // whole /team page feels uniform. Flex-wrap keeps any count
              // (2, 3, 4, 5…) centered on the row instead of jamming at
              // the left edge of a fixed grid.
              <div className="flex flex-wrap justify-center gap-10 md:gap-12 max-w-5xl mx-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {stylists.map((s: any) => (
                  <Link key={s.id} href={`/team/${s.slug}`} className="group block text-center w-full sm:w-60">
                    <div className="relative aspect-square overflow-hidden bg-cream-dark rounded-full max-w-[220px] mx-auto mb-4">
                      <StylistImage
                        src={s.image_url}
                        alt={s.name}
                        initial={s.name.charAt(0).toUpperCase()}
                        initialClass="font-heading text-6xl text-navy/25"
                        sizes="220px"
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <h3 className="font-heading text-2xl group-hover:text-rose transition-colors">{s.name}</h3>
                    {s.specialties.length > 0 && (
                      <p className="text-xs font-body text-navy/50 mt-2">
                        {s.specialties.slice(0, 3).join(" · ")}
                      </p>
                    )}
                    {s.bio && <p className="text-navy/50 text-sm font-body mt-3 line-clamp-2 max-w-xs mx-auto">{s.bio}</p>}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
