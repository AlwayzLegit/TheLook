"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  google: { rating: number | null; total: number | null };
  yelp: { rating: number | null; total: number | null };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < Math.round(rating) ? "text-gold" : "text-navy/15"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewStatsWidget() {
  const [stats, setStats] = useState<Stats>({
    google: { rating: null, total: null },
    yelp: { rating: null, total: null },
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [g, y] = await Promise.all([
          fetch("/api/google-reviews").then((r) => r.json()).catch(() => null),
          fetch("/api/yelp-reviews").then((r) => r.json()).catch(() => null),
        ]);
        setStats({
          google: { rating: g?.rating ?? null, total: g?.total ?? null },
          yelp: { rating: y?.rating ?? null, total: y?.total ?? null },
        });
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const hasGoogle = stats.google.rating != null;
  const hasYelp = stats.yelp.rating != null;

  return (
    <Link href="/admin/reviews" className="block bg-white p-5 border border-navy/10 hover:border-navy/20 transition-colors">
      <p className="text-navy/40 text-xs font-body mb-3">Reviews</p>
      {!loaded ? (
        <p className="text-navy/30 text-xs font-body">Loading...</p>
      ) : !hasGoogle && !hasYelp ? (
        <p className="text-navy/40 text-xs font-body">
          Connect Google &amp; Yelp to see live ratings here.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-body text-navy/60">Google</span>
            {hasGoogle ? (
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-sm">{stats.google.rating!.toFixed(1)}</span>
                <Stars rating={stats.google.rating!} />
                <span className="text-navy/40 text-xs font-body">({stats.google.total})</span>
              </div>
            ) : (
              <span className="text-xs text-navy/30">—</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-body text-navy/60">Yelp</span>
            {hasYelp ? (
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-sm">{stats.yelp.rating!.toFixed(1)}</span>
                <Stars rating={stats.yelp.rating!} />
                <span className="text-navy/40 text-xs font-body">({stats.yelp.total})</span>
              </div>
            ) : (
              <span className="text-xs text-navy/30">—</span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
