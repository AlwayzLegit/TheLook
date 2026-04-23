"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function MobileBookButton() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-40 lg:hidden transition-all duration-300 ${hidden ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}`}
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Link
        href="/book"
        className="flex items-center gap-2.5 bg-rose hover:bg-rose-light text-white font-body text-[11px] tracking-[0.2em] uppercase px-8 py-3.5 shadow-[var(--shadow-rose-cta-strong)] transition-all duration-300 cta-glow rounded-full"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Book Now
      </Link>
    </div>
  );
}
