"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  src: string | null | undefined;
  alt: string;
  initial: string;
  className?: string;
  // Tailwind classes for the initial text. Profile page wants a giant
  // initial (text-9xl); the Team grid + stylist cards want something
  // smaller. Defaults to the stylist-detail look.
  initialClass?: string;
  // Object-position hint for object-cover. Portraits usually want the
  // face anchored at the top so a 4:3 shot doesn't crop the head.
  position?: "top" | "center";
  // Hand-off for next/image's sizes attr so the browser picks the
  // right candidate. Defaults to a reasonable portrait breakpoint.
  sizes?: string;
}

// Image with a text-initial fallback. Uses next/image for Supabase-hosted
// URLs (allow-listed in next.config) so we get WebP/AVIF + responsive
// sizes, and falls back to a plain <img> for foreign CDNs. The initial
// letter kicks in if the URL is missing OR the network/decoder fails —
// fixes the "broken image + dark box" look you get on Chrome with HEIC.
export default function StylistImage({
  src,
  alt,
  initial,
  className = "",
  initialClass,
  position = "top",
  sizes = "(max-width: 768px) 100vw, 33vw",
}: Props) {
  const [failed, setFailed] = useState(false);
  const hasSrc = Boolean(src && src.trim());
  const objectPosition = position === "top" ? "object-top" : "object-center";

  if (!hasSrc || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[color:var(--color-cream-dark)] ${className}`}>
        <span className={initialClass || "font-heading text-9xl text-navy/25"}>{initial}</span>
      </div>
    );
  }

  const url = src!;
  const isSupabase = /\.supabase\.co\//.test(url);
  const isExternalHttp = /^https?:\/\//.test(url);

  // Supabase-hosted + whitelisted-external (unsplash) go through next/image.
  // Anything else (data URLs, unknown CDNs) falls back to <img> so we
  // don't hit the "hostname not configured" error at render time.
  if (isSupabase || url.includes("images.unsplash.com")) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes}
        onError={() => setFailed(true)}
        className={`object-cover ${objectPosition} ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      className={`w-full h-full object-cover ${objectPosition} ${className}`}
      // Guard against very small source images: browsers sometimes refuse
      // to honour object-cover when the <img>'s intrinsic size is smaller
      // than the container's computed dimensions. Forcing width/height
      // keeps the image stretched + cropped like the rest.
      style={{ width: "100%", height: "100%" }}
      {...(isExternalHttp ? {} : {})}
    />
  );
}
