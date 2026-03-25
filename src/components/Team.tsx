"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const team = [
  {
    name: "Armen P.",
    role: "Stylist — 17+ Years Experience",
    bio: "Trained in Moscow, Armen brings world-class expertise in coloring, cutting & styling. He's great at barber fades and works with both men's & women's hair. Fluent in Russian, Armenian & English.",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&q=80",
    specialties: ["Coloring", "Barber Fades", "Cutting"],
  },
  {
    name: "Kristina G.",
    role: "Stylist — 15 Years Experience",
    bio: "Trained in Armenia, Kristina has 15 years of expertise in cutting & coloring for both men's & women's hair. Fluent in Armenian, Russian & English.",
    image:
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&q=80",
    specialties: ["Cutting", "Coloring", "Men & Women"],
  },
  {
    name: "Alisa (Liz) H.",
    role: "Stylist — 30+ Years Experience",
    bio: "With over 30 years in the industry, Alisa specializes in cutting & coloring for men's & women's hair. A true veteran of the craft. Fluent in English & Armenian.",
    image:
      "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&q=80",
    specialties: ["Cutting", "Coloring", "30+ Years"],
  },
];

export default function Team() {
  return (
    <section id="team" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Meet the Artists
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">Our Team</h2>
          <div className="w-16 h-[1px] bg-rose mx-auto" />
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {team.map((member, index) => (
            <AnimatedSection key={member.name} delay={index * 0.1}>
              <div className="group text-center">
                {/* Photo */}
                <div className="relative w-52 h-52 mx-auto mb-6 rounded-full overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                <h3 className="font-heading text-xl mb-1">{member.name}</h3>
                <p className="text-rose text-sm font-body mb-3">
                  {member.role}
                </p>
                <p className="text-navy/60 text-sm font-body font-light leading-relaxed mb-4">
                  {member.bio}
                </p>

                {/* Specialties */}
                <div className="flex flex-wrap justify-center gap-2">
                  {member.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-xs font-body text-navy/50 border border-navy/15 px-3 py-1"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-12">
          <a
            href="https://thelookhairsalon.glossgenius.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-rose hover:bg-rose-light text-white tracking-widest uppercase text-sm px-10 py-4 transition-colors font-body"
          >
            Book Your Stylist
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
