"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const team = [
  {
    name: "Lilit Hovhannisyan",
    role: "Founder & Master Stylist",
    bio: "With over 15 years in the industry, Lilit founded The Look to bring high-end salon artistry to Glendale. She specializes in precision cuts and color corrections.",
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&q=80",
    specialties: ["Precision Cuts", "Color Correction", "Bridal"],
  },
  {
    name: "Anna Petrosyan",
    role: "Senior Colorist",
    bio: "Anna is our balayage and highlight specialist. Trained in Paris, she brings a European flair to every color transformation she creates.",
    image: "https://images.unsplash.com/photo-1595959183082-7b570b7e1e21?w=500&q=80",
    specialties: ["Balayage", "Highlights", "Vivid Color"],
  },
  {
    name: "Tatevik Sargsyan",
    role: "Stylist & Extensions Specialist",
    bio: "Tatevik is passionate about creating volume and length. She's certified in multiple extension methods and loves dramatic transformations.",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=500&q=80",
    specialties: ["Extensions", "Styling", "Blowouts"],
  },
  {
    name: "Nare Grigoryan",
    role: "Stylist & Treatment Expert",
    bio: "Nare focuses on hair health. From keratin treatments to deep conditioning, she helps clients restore and maintain beautiful, healthy hair.",
    image: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&q=80",
    specialties: ["Keratin", "Treatments", "Cuts"],
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <AnimatedSection key={member.name} delay={index * 0.1}>
              <div className="group text-center">
                {/* Photo */}
                <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden">
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
      </div>
    </section>
  );
}
