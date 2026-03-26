"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const posts = [
  { image: "/images/gallery/gallery-13.jpg", alt: "Hair transformation" },
  { image: "/images/gallery/gallery-14.jpg", alt: "Color work" },
  { image: "/images/gallery/gallery-15.jpg", alt: "Styling" },
  { image: "/images/gallery/gallery-16.jpg", alt: "Highlights" },
  { image: "/images/gallery/gallery-17.jpg", alt: "Cut and style" },
  { image: "/images/gallery/gallery-01.jpg", alt: "Balayage" },
  { image: "/images/gallery/gallery-06.jpg", alt: "Vivid color" },
  { image: "/images/gallery/gallery-05.jpg", alt: "Hair styling" },
];

export default function InstagramFeed() {
  return (
    <section className="py-28 md:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        <AnimatedSection className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-8 h-[1px] bg-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
              @thelookhairsalon
            </span>
            <span className="w-8 h-[1px] bg-gold" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl">
            Follow Our Journey
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {posts.map((post, index) => (
            <AnimatedSection key={index} delay={index * 0.05}>
              <a
                href="https://www.instagram.com/thelookhairsalon/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={post.alt}
                className="group relative aspect-square block overflow-hidden"
              >
                <Image
                  src={post.image}
                  alt={post.alt}
                  fill
                  className="object-cover transition-all duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/50 transition-all duration-500 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
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
            className="inline-flex items-center gap-3 text-navy/40 hover:text-navy text-[11px] tracking-[0.2em] uppercase font-body transition-colors"
          >
            Follow @thelookhairsalon
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
