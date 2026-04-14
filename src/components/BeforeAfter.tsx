"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const transformations = [
  {
    title: "Brunette to Blonde Balayage",
    before: "/images/gallery/gallery-05.jpg",
    after: "/images/gallery/gallery-01.jpg",
  },
  {
    title: "Length & Volume Extensions",
    before: "/images/gallery/gallery-03.jpg",
    after: "/images/gallery/gallery-04.jpg",
  },
  {
    title: "Color Correction to Vivid",
    before: "/images/gallery/gallery-07.jpg",
    after: "/images/gallery/gallery-06.jpg",
  },
];

function BeforeAfterSlider({
  before,
  after,
  title,
}: {
  before: string;
  after: string;
  title: string;
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    if (!isDragging) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[3/4] overflow-hidden cursor-col-resize select-none focus:outline-2 focus:outline-gold focus:outline-offset-2"
        role="slider"
        aria-label={`Before and after comparison: ${title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sliderPosition)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setSliderPosition((p) => Math.max(0, p - 5));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setSliderPosition((p) => Math.min(100, p + 5));
          }
        }}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleMove}
      >
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${after})` }} />
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${before})`, clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
        <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10" style={{ left: `${sliderPosition}%` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>
        <div className="absolute top-4 left-4 bg-navy/70 text-white text-xs font-body tracking-wider uppercase px-3 py-1 z-10">Before</div>
        <div className="absolute top-4 right-4 bg-rose/80 text-white text-xs font-body tracking-wider uppercase px-3 py-1 z-10">After</div>
      </div>
      <p className="text-center font-heading text-lg">{title}</p>
    </div>
  );
}

export default function BeforeAfter() {
  return (
    <section className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">Transformations</p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">Before &amp; After</h2>
          <div className="w-16 h-[1px] bg-rose mx-auto mb-4" />
          <p className="text-navy/60 font-body font-light">Drag the slider to reveal the transformation</p>
        </AnimatedSection>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid md:grid-cols-3 gap-8">
          {transformations.map((t) => (
            <BeforeAfterSlider key={t.title} before={t.before} after={t.after} title={t.title} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
