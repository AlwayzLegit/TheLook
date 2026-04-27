"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface CacheRow {
  source: "google" | "yelp";
  rating: number | null;
  total_count: number | null;
  reviews_count: number;
  fetched_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

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
  const { data: session, status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [googleStats, setGoogleStats] = useState<Payload | null>(null);
  const [yelpStats, setYelpStats] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Source | "low">("all");
  const [copied, setCopied] = useState(false);
  // Sync-status rows from external_reviews_cache, used for the "last
  // refreshed N minutes ago" line + the per-source error badge.
  const [cacheRows, setCacheRows] = useState<CacheRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session?.user as any)?.role;
  // Google Review URL from /admin/settings (key: google_review_url).
  // The Copy button hands this URL to clients so they land directly
  // on the salon's Google review page. Falls back to the internal
  // /review redirect when the setting is empty (e.g. fresh install).
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // /api/admin/settings is admin-only after round-9; managers
      // would 403 here. Skip it cleanly — googleReviewUrl just falls
      // back to the internal /review wrapper for managers.
      const settingsFetch = userRole === "admin" ? fetch("/api/admin/settings") : Promise.resolve(null);
      const [gRes, yRes, sRes, cRes] = await Promise.all([
        fetch("/api/google-reviews"),
        fetch("/api/yelp-reviews"),
        settingsFetch,
        fetch("/api/admin/reviews/external"),
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
      if (sRes && sRes.ok) {
        const s = (await sRes.json().catch(() => ({}))) as { google_review_url?: string };
        if (typeof s?.google_review_url === "string" && s.google_review_url.trim()) {
          setGoogleReviewUrl(s.google_review_url.trim());
        }
      }
      if (cRes.ok) {
        const c = (await cRes.json().catch(() => ({}))) as { rows?: CacheRow[] };
        if (Array.isArray(c.rows)) setCacheRows(c.rows);
      }
      merged.sort((a, b) => (b.time || 0) - (a.time || 0));
      setItems(merged);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadAll();
  }, [status, loadAll]);

  const refreshExternal = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch("/api/admin/reviews/external", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshResult(data.error || `Refresh failed (HTTP ${res.status}).`);
        return;
      }
      const failed = (data.results || []).filter((r: { ok: boolean }) => !r.ok);
      if (failed.length > 0) {
        setRefreshResult(
          `Partial refresh — ${failed.map((r: { source: string; error?: string }) => `${r.source}: ${r.error || "error"}`).join(" · ")}`,
        );
      } else {
        setRefreshResult("Refreshed Google + Yelp.");
      }
      // Re-pull everything so the badges + last-synced timestamps
      // update immediately.
      await loadAll();
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshResult(null), 4000);
    }
  };

  if (status !== "authenticated") return null;

  // Prefer the configured google_review_url so the copy button hands
  // clients the actual Google review page link, not the salon's
  // internal /review wrapper. The wrapper is kept as a fallback for
  // installs that haven't configured a Google URL yet.
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const internalFallback = `${baseUrl}/review`;
  const reviewLink = googleReviewUrl || internalFallback;
  // Truncate the URL shown on the button so a long Google `g.page/r/...`
  // link doesn't break the layout. Full URL is still what gets copied.
  const buttonLabel = (() => {
    const display = reviewLink.length > 38 ? `${reviewLink.slice(0, 35)}…` : reviewLink;
    return `Copy review link (${display})`;
  })();

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
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh is admin-only — managers can read sync status
              but not burn the Google API quota. The button hides for
              non-admins to keep the UI honest. */}
          {userRole === "admin" && (
            <Button variant="secondary" size="sm" onClick={refreshExternal} disabled={refreshing} title="Hit Google + Yelp now and update the cache">
              {refreshing ? "Refreshing..." : "Refresh Google + Yelp"}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={copyLink} title={reviewLink}>
            {copied ? "Copied!" : buttonLabel}
          </Button>
        </div>
      </div>

      {/* Sync-status row. Renders empty until the first cron run / manual
          refresh seeds external_reviews_cache; before that there's
          nothing useful to show. */}
      {(cacheRows.length > 0 || refreshResult) && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["google", "yelp"] as const).map((src) => {
            const row = cacheRows.find((r) => r.source === src);
            const label = src === "google" ? "Google" : "Yelp";
            if (!row) {
              return (
                <div key={src} className="bg-cream/40 border border-navy/10 px-3 py-2 text-xs font-body text-navy/60">
                  <span className="font-medium text-navy/80">{label}:</span> not synced yet — set the API env vars in Vercel and click Refresh.
                </div>
              );
            }
            return (
              <div key={src} className="bg-white border border-navy/10 px-3 py-2 text-xs font-body text-navy/70 flex items-start justify-between gap-3">
                <div>
                  <span className="font-medium text-navy/80">{label}:</span>{" "}
                  Last synced {formatRelative(row.last_success_at)}
                  {row.last_success_at && (
                    <span className="text-navy/40"> ({new Date(row.last_success_at).toLocaleString()})</span>
                  )}
                </div>
                {row.last_error && (
                  <span className="text-red-600 text-[11px] truncate" title={row.last_error}>
                    Last error {formatRelative(row.last_error_at)}: {row.last_error}
                  </span>
                )}
              </div>
            );
          })}
          {refreshResult && (
            <div className="sm:col-span-2 px-3 py-2 text-xs font-body bg-emerald-50 border border-emerald-200 text-emerald-900">
              {refreshResult}
            </div>
          )}
        </div>
      )}

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
        <EmptyState title="No reviews match this filter" />
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
                  <Badge tone={r.source === "Yelp" ? "danger" : "neutral"} size="sm">{r.source}</Badge>
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
