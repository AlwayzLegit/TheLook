"use client";

import { useState } from "react";
import AnimatedSection from "./AnimatedSection";
import BeforeAfterSlider from "./BeforeAfterSlider";

interface Pair {
  before: string;
  after: string;
  caption?: string;
  alt?: string;
}

interface Props {
  pairs: Pair[];
  title?: string;
  subtitle?: string;
  className?: string;
}

// Before/after pair carousel. Each pair renders as an interactive
// drag-to-compare slider (BeforeAfterSlider) — the customer scrubs a
// vertical handle to morph from before to after. Prev/next controls
// cycle through the configured pairs.
//
// Pairs are managed through /admin/gallery (Before / After tab). The
// parent page fetches rows from gallery_before_after and maps them into
// this component's prop shape. When `pairs` is empty the component
// renders NOTHING — never shows a "coming soon" placeholder.
export default function BeforeAfterCarousel({ pairs, title = "Before / After", subtitle, className = "" }: Props) {
  const [i, setI] = useState(0);

  if (!pairs || pairs.length === 0) return null;

  const pair = pairs[i];
  const prev = () => setI((v) => (v - 1 + pairs.length) % pairs.length);
  const next = () => setI((v) => (v + 1) % pairs.length);

  return (
    <AnimatedSection className={className}>
      {/* max-w-md/lg keeps the slider proportional on mobile + desktop
          without dominating the page. The slider itself uses object-cover
          so before + after fill the 4:5 frame uniformly (object-contain
          let each half render at its own aspect ratio, which produced a
          visible seam when before/after had different proportions). */}
      <div className="max-w-md md:max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-3">
            <span className="w-8 h-[1px] bg-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Results</span>
            <span className="w-8 h-[1px] bg-gold" />
          </div>
          <h3 className="font-heading text-3xl md:text-4xl">{title}</h3>
          {subtitle && <p className="text-navy/70 font-body text-sm mt-2">{subtitle}</p>}
        </div>

        <BeforeAfterSlider
          beforeUrl={pair.before}
          afterUrl={pair.after}
          alt={pair.alt}
          className="mb-4"
        />

        <p className="text-center text-[11px] tracking-[0.2em] uppercase font-body text-navy/65 mb-4">
          Drag to compare
        </p>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous pair"
            className="text-navy/70 hover:text-navy border border-navy/15 hover:border-navy/40 px-4 py-2 text-xs tracking-widest uppercase font-body transition-colors"
          >
            ← Prev
          </button>
          <p className="text-navy/70 text-sm font-body text-center flex-1 px-4">
            {pair.caption || <span className="text-navy/30">{i + 1} of {pairs.length}</span>}
          </p>
          <button
            type="button"
            onClick={next}
            aria-label="Next pair"
            className="text-navy/70 hover:text-navy border border-navy/15 hover:border-navy/40 px-4 py-2 text-xs tracking-widest uppercase font-body transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </AnimatedSection>
  );
}
