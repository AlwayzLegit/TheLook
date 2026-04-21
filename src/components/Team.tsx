"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AnimatedSection from "./AnimatedSection";
import StylistImage from "./StylistImage";

interface TeamMember {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image_url: string | null;
  specialties: string[];
}

// Fallback used while API loads or if DB not configured
const FALLBACK: TeamMember[] = [
  {
    id: "armen-p", slug: "armen-p", name: "Armen P.",
    bio: "Trained in Moscow. World-class expertise in coloring, cutting & styling. Specialist in barber fades for men & women.",
    image_url: null,
    specialties: ["Coloring", "Barber Fades", "Cutting"],
  },
  {
    id: "kristina-g", slug: "kristina-g", name: "Kristina G.",
    bio: "Trained in Armenia. 15 years of expertise in cutting & coloring for both men's & women's hair.",
    image_url: null,
    specialties: ["Cutting", "Coloring", "Men & Women"],
  },
  {
    id: "alisa-h", slug: "alisa-h", name: "Alisa (Liz) H.",
    bio: "Over 30 years in the industry. Specializes in cutting & coloring. A true veteran of the craft.",
    image_url: null,
    specialties: ["Cutting", "Coloring", "30+ Years"],
  },
];

function getInitials(name: string): string {
  return name.split(/[\s()]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>(FALLBACK);

  useEffect(() => {
    fetch("/api/stylists")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setTeam(data.map((s: any) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            bio: s.bio,
            image_url: s.image_url,
            specialties: Array.isArray(s.specialties) ? s.specialties : [],
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section id="team" className="py-28 md:py-36 bg-cream">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        <AnimatedSection className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-8 h-[1px] bg-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
              Meet the Artists
            </span>
            <span className="w-8 h-[1px] bg-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl">Our Team</h2>
          <p className="text-navy/50 font-body text-sm mt-3">
            Click any stylist to see their full portfolio and book with them directly.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {team.map((member, index) => (
            <AnimatedSection key={member.id} delay={index * 0.15}>
              <Link href={`/stylists/${member.slug}`} className="group text-center block">
                <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-navy/8 flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-gold/40 transition-all">
                  <StylistImage
                    src={member.image_url}
                    alt={member.name}
                    initial={getInitials(member.name)}
                    initialClass="font-heading text-3xl text-navy/30"
                  />
                </div>

                <h3 className="font-heading text-xl mb-1 group-hover:text-rose transition-colors">{member.name}</h3>
                {member.bio && (
                  <p className="text-navy/60 text-sm font-body font-light leading-relaxed mb-5 max-w-xs mx-auto line-clamp-3">
                    {member.bio}
                  </p>
                )}

                {member.specialties.length > 0 && (
                  <p className="text-xs font-body text-navy/50 tracking-wide">
                    {member.specialties.slice(0, 3).join(" · ")}
                  </p>
                )}

                <p className="text-[10px] font-body text-rose uppercase tracking-[0.2em] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Portfolio &rarr;
                </p>
              </Link>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-14 flex flex-wrap justify-center gap-4">
          <Link
            href="/stylists"
            className="inline-block border border-navy/30 hover:border-navy text-navy text-[11px] tracking-[0.2em] uppercase px-10 py-4 transition-all duration-300"
          >
            All Stylists
          </Link>
          <Link
            href="/book"
            className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-10 py-4 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(184,36,59,0.3)]"
          >
            Book Your Stylist
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
