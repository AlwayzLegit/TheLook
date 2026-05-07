"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isOptimizableImageHost } from "@/lib/imageHosts";

// Drag-to-compare before/after slider. Renders the "after" image at full
// width, then overlays the "before" image clipped from the left edge to
// a movable handle. Dragging the vertical handle (or tapping anywhere
// on the image) changes the clip percentage so the customer can scrub
// between the two states.
//
// Pointer events cover mouse, touch, and stylus in one path — no
// touchstart/mousemove duplication, no double-fire on hybrid devices.

interface Props {
  beforeUrl: string;
  afterUrl: string;
  alt?: string;
  className?: string;
}

export default function BeforeAfterSlider({ beforeUrl, afterUrl, alt, className = "" }: Props) {
  // Position is the percent from left where the divider sits — 50% means
  // half-and-half. Initial state is 50 so the customer sees both halves
  // before they interact.
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromEvent = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    // Clamp to 1..99 so the handle stays grabbable at the extremes.
    setPos(Math.max(1, Math.min(99, next)));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      updateFromEvent(e.clientX);
    },
    [updateFromEvent],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      updateFromEvent(e.clientX);
    },
    [updateFromEvent],
  );
  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // pointer was already released
    }
  }, []);

  // Keyboard accessibility — when the handle has focus, ←/→ shifts it
  // 1% per keypress, ↑/↓ shifts 5% so power users can fine-tune.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(1, p - 1));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(99, p + 1));
    else if (e.key === "ArrowDown") setPos((p) => Math.max(1, p - 5));
    else if (e.key === "ArrowUp") setPos((p) => Math.min(99, p + 5));
    else return;
    e.preventDefault();
  };

  // Reset to 50/50 on image change so a new pair doesn't inherit the
  // previous slider position.
  useEffect(() => {
    setPos(50);
  }, [beforeUrl, afterUrl]);

  const beforeUnoptimized = !isOptimizableImageHost(beforeUrl);
  const afterUnoptimized = !isOptimizableImageHost(afterUrl);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[4/5] w-full overflow-hidden bg-cream-dark select-none touch-none cursor-ew-resize ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label={alt ? `Before and after — ${alt}` : "Before and after slider"}
    >
      {/* Both halves use object-cover so they fill the 4:5 frame
          identically. object-contain (the previous behavior) preserved
          each photo's natural aspect ratio independently — when before
          and after had different ratios, the two halves rendered at
          different scales and overflowed / underfilled at the seam. With
          object-cover any tiny edge crop is uniform across the divider,
          so the comparison reads cleanly. object-position center is the
          default; for hair shots both top (hairline) and bottom (length)
          can matter, so we don't anchor either side. */}

      {/* AFTER — full canvas; this is the "default" half the customer
          starts seeing more of by convention. */}
      <Image
        src={afterUrl}
        alt={alt ? `After — ${alt}` : "After"}
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        className="object-cover pointer-events-none"
        unoptimized={afterUnoptimized}
        priority={false}
      />

      {/* BEFORE — clipped from left edge to `pos` percent. inset-0 clip
          rectangle: top, right, bottom, left. We want the LEFT portion
          visible so right is (100 - pos)%. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <Image
          src={beforeUrl}
          alt={alt ? `Before — ${alt}` : "Before"}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
          unoptimized={beforeUnoptimized}
          priority={false}
        />
      </div>

      {/* Static labels in opposite corners — only the half that's
          currently shown stays opaque. Helps customers orient when
          they first load the slider. */}
      <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] tracking-[0.2em] uppercase font-body px-2 py-1 pointer-events-none">
        Before
      </span>
      <span className="absolute top-3 right-3 bg-rose text-white text-[10px] tracking-[0.2em] uppercase font-body px-2 py-1 pointer-events-none">
        After
      </span>

      {/* Vertical divider line + draggable handle */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white/90 pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-1px)" }}
      />
      <button
        type="button"
        aria-label="Drag to compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        role="slider"
        onKeyDown={onKeyDown}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-navy/10 flex items-center justify-center text-navy/70 cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-rose"
        style={{ left: `${pos}%` }}
        // Stop the click on the handle from registering as a tap-to-jump
        // on the parent. Drag still works because pointerdown bubbles to
        // the parent's handler.
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5l-5 7 5 7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l5 7-5 7" />
        </svg>
      </button>
    </div>
  );
}
