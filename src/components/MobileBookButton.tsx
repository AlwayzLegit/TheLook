"use client";

export default function MobileBookButton() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden">
      <a
        href="#contact"
        className="flex items-center gap-2 bg-rose hover:bg-rose-light text-white font-body text-sm tracking-widest uppercase px-8 py-3.5 shadow-lg shadow-rose/30 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Book Now
      </a>
    </div>
  );
}
