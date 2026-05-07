import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-gold text-sm tracking-[0.3em] uppercase font-body mb-4">404</p>
        <h1 className="font-heading text-4xl text-navy mb-4">Page not found</h1>
        <p className="text-navy/60 font-body mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-rose hover:bg-rose-light text-white tracking-widest uppercase text-sm px-8 py-3 transition-colors font-body"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
