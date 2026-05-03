"use client";

interface Props {
  variant?: "dark" | "light";
}

const YELP_ALIAS_FALLBACK = "the-look-hair-salon-glendale";

function getReviewLinks() {
  const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;
  const yelpAlias = process.env.NEXT_PUBLIC_YELP_BUSINESS_ALIAS || YELP_ALIAS_FALLBACK;

  const googleUrl = placeId
    ? `https://search.google.com/local/writereview?placeid=${placeId}`
    : "https://www.google.com/search?q=The+Look+Hair+Salon+Glendale+Reviews";
  const yelpUrl = `https://www.yelp.com/writeareview/biz/${yelpAlias}`;

  return { googleUrl, yelpUrl };
}

export default function LeaveReviewCTA({ variant = "dark" }: Props) {
  const { googleUrl, yelpUrl } = getReviewLinks();
  const isDark = variant === "dark";

  const containerClass = isDark
    ? "bg-navy/40 border border-white/8"
    : "bg-white border border-navy/10";
  const headingClass = isDark ? "text-white" : "text-navy";
  const subheadClass = isDark ? "text-white/55" : "text-navy/70";
  const googleBtn = isDark
    ? "bg-white text-navy hover:bg-white/90"
    : "bg-navy text-white hover:bg-navy/90";
  const yelpBtn = isDark
    ? "bg-rose text-white hover:bg-rose-light"
    : "bg-rose text-white hover:bg-rose-light";

  return (
    <div className={`${containerClass} p-8 md:p-10 text-center`}>
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="w-8 h-[1px] bg-gold" />
        <span className="text-gold text-[11px] tracking-[0.3em] uppercase font-body">Your Turn</span>
        <span className="w-8 h-[1px] bg-gold" />
      </div>
      <h3 className={`font-heading text-2xl md:text-3xl mb-2 ${headingClass}`}>
        Loved your visit? Leave us a review
      </h3>
      <p className={`font-body text-sm mb-6 max-w-xl mx-auto ${subheadClass}`}>
        Your words help other Glendale locals find us and mean the world to our stylists.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2.5 px-7 py-3 text-[11px] tracking-[0.2em] uppercase font-body transition-all ${googleBtn}`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Review on Google
        </a>
        <a
          href={yelpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2.5 px-7 py-3 text-[11px] tracking-[0.2em] uppercase font-body transition-all ${yelpBtn}`}
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 011.596-.206 7.26 7.26 0 011.96 3.164c.252.754-.09 1.478-.29 1.547zm-7.455 5.13l1.105-5.088c.226-.98 1.59-1.048 1.923-.096l1.703 4.872c.22.63-.14 1.31-.796 1.508a7.073 7.073 0 01-3.635.04c-.76-.196-.506-1.236-.3-1.236zm-3.31-4.636l4.923 1.688c.952.326.952 1.64 0 1.966l-4.923 1.688c-.632.217-1.278-.258-1.36-.928a7.09 7.09 0 010-3.486c.082-.67.728-1.145 1.36-.928zM5.7 6.705c.14-.67.86-1.016 1.468-.71l4.472 2.252c.884.445.69 1.74-.282 1.887l-5.194.8c-.645.098-1.222-.39-1.28-1.04a7.12 7.12 0 01.816-3.189zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
          </svg>
          Review on Yelp
        </a>
      </div>
    </div>
  );
}
