import { apiSuccess, logError } from "@/lib/apiResponse";

// Cache reviews for 6 hours
let cache: { data: unknown; expires: number } | null = null;
const CACHE_DURATION = 6 * 60 * 60 * 1000;

export async function GET() {
  const apiKey = process.env.YELP_API_KEY;
  const alias = process.env.YELP_BUSINESS_ALIAS;

  if (!apiKey || !alias) {
    return apiSuccess({ reviews: [], rating: null, total: null });
  }

  if (cache && cache.expires > Date.now()) {
    return apiSuccess(cache.data);
  }

  try {
    const [businessRes, reviewsRes] = await Promise.all([
      fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(alias)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }),
      fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(alias)}/reviews?sort_by=yelp_sort`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }),
    ]);

    if (!businessRes.ok || !reviewsRes.ok) {
      return apiSuccess({ reviews: [], rating: null, total: null });
    }

    const business = await businessRes.json();
    const reviewsData = await reviewsRes.json();

    const result = {
      reviews: (reviewsData.reviews || []).slice(0, 3).map((r: {
        user: { name: string; image_url: string };
        rating: number;
        text: string;
        time_created: string;
        url: string;
      }) => ({
        author: r.user?.name ?? "Yelp user",
        authorPhoto: r.user?.image_url ?? null,
        rating: r.rating,
        text: r.text,
        time: new Date(r.time_created).getTime() / 1000,
        relative: new Date(r.time_created).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        url: r.url,
      })),
      rating: business.rating ?? null,
      total: business.review_count ?? null,
    };

    cache = { data: result, expires: Date.now() + CACHE_DURATION };
    return apiSuccess(result);
  } catch (err) {
    logError("yelp-reviews GET", err);
    return apiSuccess({ reviews: [], rating: null, total: null });
  }
}
