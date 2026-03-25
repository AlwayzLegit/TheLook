"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const transformations = [
  {
    title: "Brunette to Blonde Balayage",
    before:
      "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80",
    after:
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80",
  },
  {
    title: "Length & Volume Extensions",
    before:
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
    after:
      "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=600&q=80",
  },
  {
    title: "Color Correction to Vibrant Red",
    before:
      "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80",
    after:
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&q=80",
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
        className="relative aspect-[3/4] overflow-hidden cursor-col-resize select-none"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleMove}
      >
        {/* After image (full background) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${after})` }}
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${before})`,
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        />

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-navy"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-navy/70 text-white text-xs font-body tracking-wider uppercase px-3 py-1 z-10">
          Before
        </div>
        <div className="absolute top-4 right-4 bg-rose/80 text-white text-xs font-body tracking-wider uppercase px-3 py-1 z-10">
          After
        </div>
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
          <p className="text-gold tracking-[0.3em] uppercase text-sm mb-4 font-body">
            Transformations
          </p>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Before & After
          </h2>
          <div className="w-16 h-[1px] bg-rose mx-auto mb-4" />
          <p className="text-navy/60 font-body font-light">
            Drag the slider to reveal the transformation
          </p>
        </AnimatedSection>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {transformations.map((t) => (
            <BeforeAfterSlider
              key={t.title}
              before={t.before}
              after={t.after}
              title={t.title}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
