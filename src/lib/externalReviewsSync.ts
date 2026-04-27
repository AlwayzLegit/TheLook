import { supabase, hasSupabaseConfig } from "./supabase";
import { logError } from "./apiResponse";

// Daily refresh of Google + Yelp review payloads. Hits each upstream
// API once, persists the trimmed result into external_reviews_cache,
// and records the last error per source. Public read routes
// (/api/google-reviews, /api/yelp-reviews) read straight from the
// cache so a Vercel cold start never pays an API round-trip.

export type ExternalReviewSource = "google" | "yelp";

interface CachedReview {
  author: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  time: number;
  relative: string;
  url?: string;
}

export interface CachedReviewPayload {
  reviews: CachedReview[];
  rating: number | null;
  total: number | null;
}

interface SourceResult {
  source: ExternalReviewSource;
  ok: boolean;
  error?: string;
  rating?: number | null;
  total?: number | null;
  reviewCount?: number;
}

async function fetchGooglePayload(): Promise<{ ok: true; payload: CachedReviewPayload } | { ok: false; error: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) {
    return { ok: false, error: "GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID missing" };
  }
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total,reviews&key=${apiKey}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.status !== "OK") {
      return { ok: false, error: `Google API status=${data.status}: ${data.error_message || "unknown"}` };
    }
    const reviews: CachedReview[] = (data.result?.reviews || [])
      .slice(0, 5)
      .map(
        (r: {
          author_name: string;
          profile_photo_url?: string;
          rating: number;
          text: string;
          time: number;
          relative_time_description: string;
        }) => ({
          author: r.author_name,
          authorPhoto: r.profile_photo_url ?? null,
          rating: r.rating,
          text: r.text,
          time: r.time,
          relative: r.relative_time_description,
        }),
      );
    return {
      ok: true,
      payload: {
        reviews,
        rating: typeof data.result?.rating === "number" ? data.result.rating : null,
        total:
          typeof data.result?.user_ratings_total === "number"
            ? data.result.user_ratings_total
            : null,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function fetchYelpPayload(): Promise<{ ok: true; payload: CachedReviewPayload } | { ok: false; error: string }> {
  const apiKey = process.env.YELP_API_KEY;
  const alias = process.env.YELP_BUSINESS_ALIAS;
  if (!apiKey || !alias) {
    return { ok: false, error: "YELP_API_KEY or YELP_BUSINESS_ALIAS missing" };
  }
  try {
    const [businessRes, reviewsRes] = await Promise.all([
      fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(alias)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }),
      fetch(
        `https://api.yelp.com/v3/businesses/${encodeURIComponent(alias)}/reviews?sort_by=yelp_sort`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
        },
      ),
    ]);
    if (!businessRes.ok) {
      return { ok: false, error: `Yelp business endpoint ${businessRes.status}` };
    }
    if (!reviewsRes.ok) {
      return { ok: false, error: `Yelp reviews endpoint ${reviewsRes.status}` };
    }
    const business = await businessRes.json();
    const reviewsData = await reviewsRes.json();
    const reviews: CachedReview[] = (reviewsData.reviews || [])
      .slice(0, 3)
      .map(
        (r: {
          user: { name?: string; image_url?: string };
          rating: number;
          text: string;
          time_created: string;
          url?: string;
        }) => ({
          author: r.user?.name ?? "Yelp user",
          authorPhoto: r.user?.image_url ?? null,
          rating: r.rating,
          text: r.text,
          time: new Date(r.time_created).getTime() / 1000,
          relative: new Date(r.time_created).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          url: r.url,
        }),
      );
    return {
      ok: true,
      payload: {
        reviews,
        rating: typeof business.rating === "number" ? business.rating : null,
        total: typeof business.review_count === "number" ? business.review_count : null,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function persistResult(
  source: ExternalReviewSource,
  result: { ok: true; payload: CachedReviewPayload } | { ok: false; error: string },
) {
  if (!hasSupabaseConfig) return;
  const now = new Date().toISOString();
  if (result.ok) {
    const { error } = await supabase.from("external_reviews_cache").upsert(
      {
        source,
        rating: result.payload.rating,
        total_count: result.payload.total,
        reviews: result.payload.reviews,
        fetched_at: now,
        last_success_at: now,
        last_error: null,
        last_error_at: null,
        updated_at: now,
      },
      { onConflict: "source" },
    );
    if (error) logError(`externalReviewsSync persist ${source}`, error);
  } else {
    // Stamp last_error WITHOUT clearing the cached payload — a transient
    // upstream failure shouldn't blank out the public badges.
    const { error } = await supabase
      .from("external_reviews_cache")
      .upsert(
        {
          source,
          fetched_at: now,
          last_error: result.error.slice(0, 500),
          last_error_at: now,
          updated_at: now,
        },
        { onConflict: "source", ignoreDuplicates: false },
      );
    if (error) logError(`externalReviewsSync error-stamp ${source}`, error);
  }
}

export async function syncExternalReviews(): Promise<SourceResult[]> {
  const [googleResult, yelpResult] = await Promise.all([
    fetchGooglePayload(),
    fetchYelpPayload(),
  ]);
  await Promise.all([
    persistResult("google", googleResult),
    persistResult("yelp", yelpResult),
  ]);
  const summarise = (
    source: ExternalReviewSource,
    r: typeof googleResult,
  ): SourceResult => {
    if (r.ok) {
      return {
        source,
        ok: true,
        rating: r.payload.rating,
        total: r.payload.total,
        reviewCount: r.payload.reviews.length,
      };
    }
    return { source, ok: false, error: r.error };
  };
  return [summarise("google", googleResult), summarise("yelp", yelpResult)];
}

// Read the cached payload for a single source. Returns null when the
// row hasn't been seeded yet AND no upstream credentials are
// available — the public route renders the same empty shape it used
// to fall back to.
export async function readCachedReviews(
  source: ExternalReviewSource,
): Promise<CachedReviewPayload | null> {
  if (!hasSupabaseConfig) return null;
  const { data, error } = await supabase
    .from("external_reviews_cache")
    .select("rating, total_count, reviews, last_success_at")
    .eq("source", source)
    .maybeSingle();
  if (error) {
    logError(`readCachedReviews ${source}`, error);
    return null;
  }
  if (!data) return null;
  if (!data.last_success_at && (!data.reviews || (Array.isArray(data.reviews) && data.reviews.length === 0))) {
    // Row exists but has only an error stamp — nothing useful to show.
    return null;
  }
  return {
    reviews: Array.isArray(data.reviews) ? (data.reviews as CachedReview[]) : [],
    rating: typeof data.rating === "number" ? data.rating : null,
    total: typeof data.total_count === "number" ? data.total_count : null,
  };
}

export interface AdminCacheRow {
  source: ExternalReviewSource;
  rating: number | null;
  total_count: number | null;
  reviews_count: number;
  fetched_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

// Admin-status read — surfaces the full row (minus the bulky reviews
// array) so /admin/reviews can render "last sync" + "last error" per
// source without dumping the full payload to the client.
export async function readCacheStatus(): Promise<AdminCacheRow[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from("external_reviews_cache")
    .select("source, rating, total_count, reviews, fetched_at, last_success_at, last_error, last_error_at");
  if (error) {
    logError("readCacheStatus", error);
    return [];
  }
  return ((data || []) as Array<{
    source: ExternalReviewSource;
    rating: number | null;
    total_count: number | null;
    reviews: unknown;
    fetched_at: string | null;
    last_success_at: string | null;
    last_error: string | null;
    last_error_at: string | null;
  }>).map((r) => ({
    source: r.source,
    rating: r.rating,
    total_count: r.total_count,
    reviews_count: Array.isArray(r.reviews) ? r.reviews.length : 0,
    fetched_at: r.fetched_at,
    last_success_at: r.last_success_at,
    last_error: r.last_error,
    last_error_at: r.last_error_at,
  }));
}
