"use client";

import { useState } from "react";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

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

// Simple before/after pair carousel. Each pair shows the before photo on
// the left and the after on the right, with a caption under. Prev/next
// controls cycle through pairs.
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
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-3">
            <span className="w-8 h-[1px] bg-gold" />
            <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Results</span>
            <span className="w-8 h-[1px] bg-gold" />
          </div>
          <h3 className="font-heading text-3xl md:text-4xl">{title}</h3>
          {subtitle && <p className="text-navy/60 font-body text-sm mt-2">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="aspect-[3/4] bg-cream-dark relative overflow-hidden">
            <Image
              src={pair.before}
              alt={`Before — ${pair.alt || ""}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
              unoptimized={!/\.supabase\.co\//.test(pair.before) && !pair.before.includes("images.unsplash.com")}
            />
            <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] tracking-[0.2em] uppercase font-body px-2 py-1">Before</span>
          </div>
          <div className="aspect-[3/4] bg-cream-dark relative overflow-hidden">
            <Image
              src={pair.after}
              alt={`After — ${pair.alt || ""}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
              unoptimized={!/\.supabase\.co\//.test(pair.after) && !pair.after.includes("images.unsplash.com")}
            />
            <span className="absolute top-3 left-3 bg-rose text-white text-[10px] tracking-[0.2em] uppercase font-body px-2 py-1">After</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous pair"
            className="text-navy/50 hover:text-navy border border-navy/15 hover:border-navy/40 px-4 py-2 text-xs tracking-widest uppercase font-body transition-colors"
          >
            ← Prev
          </button>
          <p className="text-navy/60 text-sm font-body text-center flex-1 px-4">
            {pair.caption || <span className="text-navy/30">{i + 1} of {pairs.length}</span>}
          </p>
          <button
            type="button"
            onClick={next}
            aria-label="Next pair"
            className="text-navy/50 hover:text-navy border border-navy/15 hover:border-navy/40 px-4 py-2 text-xs tracking-widest uppercase font-body transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </AnimatedSection>
  );
}
