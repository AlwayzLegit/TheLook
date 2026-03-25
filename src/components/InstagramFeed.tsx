"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const posts = [
  {
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80",
    alt: "Blonde balayage transformation",
    likes: 234,
  },
  {
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80",
    alt: "Salon interior shot",
    likes: 189,
  },
  {
    image: "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=400&q=80",
    alt: "Textured layers haircut",
    likes: 312,
  },
  {
    image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&q=80",
    alt: "Curly hair styling",
    likes: 198,
  },
  {
    image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=80",
    alt: "Bridal updo styling",
    likes: 276,
  },
  {
    image: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&q=80",
    alt: "Precision bob haircut",
    likes: 245,
  },
  {
    image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80",
    alt: "Natural hair styling",
    likes: 167,
  },
  {
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80",
    alt: "Hair color transformation",
    likes: 289,
  },
];

export default function InstagramFeed() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            @thelookhairsalon
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Follow Us on Instagram
          </h2>
          <div className="w-16 h-[1px] bg-rose mx-auto" />
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {posts.map((post, index) => (
            <AnimatedSection key={index} delay={index * 0.05}>
              <a
                href="https://www.instagram.com/thelookhairsalon/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square block overflow-hidden"
              >
                <Image
                  src={post.image}
                  alt={post.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="font-body font-bold">{post.likes}</span>
                  </div>
                </div>
              </a>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-10">
          <a
            href="https://www.instagram.com/thelookhairsalon/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-navy hover:bg-navy-light text-white font-body text-sm tracking-widest uppercase px-8 py-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Follow @thelookhairsalon
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
