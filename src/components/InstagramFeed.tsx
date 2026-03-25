"use client";

import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const posts = [
  {
    image: "https://static.wixstatic.com/media/a9fd8e_9c9fc23ceb3645328c20e9026b2d5b11~mv2.jpg",
    alt: "Hair transformation by The Look",
  },
  {
    image: "https://static.wixstatic.com/media/a9fd8e_b046994a4dde47e4be40623d1d6ff325~mv2.jpg",
    alt: "Color work at The Look Salon",
  },
  {
    image: "https://static.wixstatic.com/media/a9fd8e_b74c063c275c42628ba442d3d3c84363~mv2.jpg",
    alt: "Styling at The Look Hair Salon",
  },
  {
    image: "https://static.wixstatic.com/media/a9fd8e_d816be97f8a542fa9e5a04f978bd6cda~mv2.jpg",
    alt: "Highlights by The Look",
  },
  {
    image: "https://static.wixstatic.com/media/a9fd8e_f2c0078488a247b19e4ab16451722e8e~mv2.jpg",
    alt: "Cut and style at The Look",
  },
  {
    image: "https://static.wixstatic.com/media/a9fd8e_0f182f499970493b97f1ac76c0735b60~mv2.jpg",
    alt: "Balayage transformation",
  },
  {
    image: "https://static.wixstatic.com/media/a9fd8e_40a3f01e86f1470bab36d6af5c75621f~mv2.jpg",
    alt: "Vivid color work",
  },
  {
    image: "https://static.wixstatic.com/media/a9fd8e_2d18fb987e1f48769e9586d284ade3d0~mv2.jpg",
    alt: "Hair styling showcase",
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
                aria-label={post.alt}
                className="group relative aspect-square block overflow-hidden"
              >
                <Image
                  src={post.image}
                  alt={post.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
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
