import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="w-8 h-[1px] bg-gold" />
          <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">
            Page Not Found
          </span>
          <span className="w-8 h-[1px] bg-gold" />
        </div>
        <h1 className="font-heading text-5xl md:text-6xl text-navy mb-6">404</h1>
        <p className="text-navy/70 font-body font-light mb-10">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-block border border-navy/20 text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-all duration-300 hover:border-navy"
          >
            Return Home
          </Link>
          <Link
            href="/book"
            className="inline-block bg-rose hover:bg-rose-light text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-all duration-300 hover:shadow-[var(--shadow-rose-cta)]"
          >
            Book Now
          </Link>
        </div>
      </div>
    </main>
  );
}
