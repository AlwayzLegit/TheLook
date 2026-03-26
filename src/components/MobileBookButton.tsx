"use client";

import Link from "next/link";

export default function MobileBookButton() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden">
      <Link
        href="/book"
        className="flex items-center gap-2.5 bg-rose hover:bg-rose-light text-white font-body text-[11px] tracking-[0.2em] uppercase px-8 py-3.5 shadow-[0_4px_20px_rgba(184,36,59,0.4)] transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Book Now
      </Link>
    </div>
  );
}
