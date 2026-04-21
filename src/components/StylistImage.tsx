"use client";

import { useState } from "react";

interface Props {
  src: string | null | undefined;
  alt: string;
  initial: string;
  className?: string;
  // Tailwind classes for the initial text. Profile page wants a giant
  // initial (text-9xl); the Team grid + stylist cards want something
  // smaller. Defaults to the stylist-detail look.
  initialClass?: string;
}

// Image with a text-initial fallback. Client-side so we can swap to the
// initial when the <img> fires onError (broken URL, network, ad-blocker).
export default function StylistImage({ src, alt, initial, className = "", initialClass }: Props) {
  const [failed, setFailed] = useState(false);
  const hasSrc = Boolean(src && src.trim());

  if (!hasSrc || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-navy/5 ${className}`}>
        <span className={initialClass || "font-heading text-9xl text-navy/20"}>{initial}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src!}
      alt={alt}
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
