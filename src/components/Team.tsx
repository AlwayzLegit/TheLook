"use client";

import Link from "next/link";
import AnimatedSection from "./AnimatedSection";

const team = [
  {
    name: "Armen P.",
    role: "Stylist \u00B7 17+ Years",
    bio: "Trained in Moscow. World-class expertise in coloring, cutting & styling. Specialist in barber fades for men & women.",
    initials: "AP",
    specialties: ["Coloring", "Barber Fades", "Cutting"],
  },
  {
    name: "Kristina G.",
    role: "Stylist \u00B7 15 Years",
    bio: "Trained in Armenia. 15 years of expertise in cutting & coloring for both men's & women's hair.",
    initials: "KG",
    specialties: ["Cutting", "Coloring", "Men & Women"],
  },
  {
    name: "Alisa (Liz) H.",
    role: "Stylist \u00B7 30+ Years",
    bio: "Over 30 years in the industry. Specializes in cutting & coloring. A true veteran of the craft.",
    initials: "LH",
    specialties: ["Cutting", "Coloring", "30+ Years"],
  },
];

export default function Team() {
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
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {team.map((member, index) => (
            <AnimatedSection key={member.name} delay={index * 0.15}>
              <div className="group text-center">
                <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-navy/8 flex items-center justify-center">
                  <span className="font-heading text-3xl text-navy/30">
                    {member.initials}
                  </span>
                </div>

                <h3 className="font-heading text-xl mb-1">{member.name}</h3>
                <p className="text-rose text-[11px] tracking-[0.15em] uppercase font-body mb-4">
                  {member.role}
                </p>
                <p className="text-navy/60 text-sm font-body font-light leading-relaxed mb-5 max-w-xs mx-auto">
                  {member.bio}
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  {member.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-body text-navy/50 tracking-[0.1em] uppercase border border-navy/10 px-3 py-1"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-14">
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
