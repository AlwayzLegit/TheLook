import { apiSuccess } from "@/lib/apiResponse";
import { readCachedReviews } from "@/lib/externalReviewsSync";

// Public read for Yelp reviews. Reads from external_reviews_cache
// (populated daily by /api/cron/sync-reviews + on demand from
// /admin/reviews → "Refresh now"). Yelp's Fusion API is rate-limited
// per-day rather than per-call so even with no traffic we'd benefit
// from a single daily refresh and DB-backed reads.

export async function GET() {
  const cached = await readCachedReviews("yelp");
  if (cached) return apiSuccess(cached);
  return apiSuccess({ reviews: [], rating: null, total: null });
}
