"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ApiReview {
  author: string;
  authorPhoto?: string | null;
  rating: number;
  text: string;
  time: number;
  relative: string;
  url?: string;
}
interface Payload {
  reviews: ApiReview[];
  rating: number | null;
  total: number | null;
}

type Source = "Google" | "Yelp";

interface FeedItem extends ApiReview {
  source: Source;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-gold" : "text-navy/15"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [googleStats, setGoogleStats] = useState<Payload | null>(null);
  const [yelpStats, setYelpStats] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Source | "low">("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const [gRes, yRes] = await Promise.all([
          fetch("/api/google-reviews"),
          fetch("/api/yelp-reviews"),
        ]);
        const merged: FeedItem[] = [];
        if (gRes.ok) {
          const g: Payload = await gRes.json();
          setGoogleStats(g);
          for (const r of g.reviews || []) merged.push({ ...r, source: "Google" });
        }
        if (yRes.ok) {
          const y: Payload = await yRes.json();
          setYelpStats(y);
          for (const r of y.reviews || []) merged.push({ ...r, source: "Yelp" });
        }
        merged.sort((a, b) => (b.time || 0) - (a.time || 0));
        setItems(merged);
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  if (status !== "authenticated") return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const reviewLink = `${baseUrl}/review`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const filtered = items.filter((it) => {
    if (filter === "all") return true;
    if (filter === "low") return it.rating <= 3;
    return it.source === filter;
  });

  const noKeys = !googleStats?.rating && !yelpStats?.rating && items.length === 0;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-heading text-3xl">Reviews</h1>
        <button
          onClick={copyLink}
          className="px-4 py-2 border border-navy/20 text-sm font-body hover:bg-navy/5 transition-colors"
        >
          {copied ? "Copied!" : `Copy review link (${reviewLink || "/review"})`}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 border border-navy/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-body text-navy/60">Google</span>
            {googleStats?.rating ? (
              <span className="font-heading text-2xl">{googleStats.rating.toFixed(1)}</span>
            ) : (
              <span className="text-xs text-navy/30">Not configured</span>
            )}
          </div>
          {googleStats?.rating ? (
            <div className="flex items-center gap-2">
              <Stars rating={googleStats.rating} />
              <span className="text-navy/40 text-xs font-body">{googleStats.total} reviews</span>
            </div>
          ) : null}
        </div>
        <div className="bg-white p-5 border border-navy/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-body text-navy/60">Yelp</span>
            {yelpStats?.rating ? (
              <span className="font-heading text-2xl">{yelpStats.rating.toFixed(1)}</span>
            ) : (
              <span className="text-xs text-navy/30">Not configured</span>
            )}
          </div>
          {yelpStats?.rating ? (
            <div className="flex items-center gap-2">
              <Stars rating={yelpStats.rating} />
              <span className="text-navy/40 text-xs font-body">{yelpStats.total} reviews</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(["all", "Google", "Yelp", "low"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-body transition-colors ${
              filter === f ? "bg-navy text-white" : "border border-navy/20 text-navy/60 hover:bg-navy/5"
            }`}
          >
            {f === "all" ? "All" : f === "low" ? "3 stars or lower" : f}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading reviews...</p>
      ) : noKeys ? (
        <div className="bg-white border border-navy/10 p-8 text-center">
          <p className="font-heading text-lg mb-2">Connect your review sources</p>
          <p className="text-navy/60 font-body text-sm mb-5 max-w-md mx-auto">
            Hook up Google Business and Yelp so new reviews land in this dashboard — with
            star counts, recent comments, and one-click reply links.
          </p>
          <p className="text-navy/40 font-body text-xs">
            Setup takes ~5 minutes. Your developer will need to add the API credentials
            in the Vercel project settings.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No reviews match this filter.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => (
            <div
              key={`${r.source}-${i}`}
              className={`bg-white border p-5 ${
                r.rating <= 3 ? "border-red-200" : "border-navy/10"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {r.authorPhoto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.authorPhoto} alt={r.author} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center">
                      <span className="font-heading text-sm">{r.author.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-body font-medium text-sm">{r.author}</p>
                    <p className="text-navy/40 text-xs font-body">{r.relative}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-body tracking-wider uppercase px-2.5 py-1 ${
                    r.source === "Yelp" ? "bg-rose/10 text-rose" : "bg-navy/5 text-navy/60"
                  }`}>
                    {r.source}
                  </span>
                  <Stars rating={r.rating} />
                </div>
              </div>
              <p className="text-navy/70 font-body text-sm leading-relaxed mb-3">{r.text}</p>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-body text-rose hover:underline"
                >
                  Reply on {r.source} &rarr;
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
