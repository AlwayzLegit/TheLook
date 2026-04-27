import { apiSuccess } from "@/lib/apiResponse";
import { readCachedReviews } from "@/lib/externalReviewsSync";

// Public read for Google reviews. Reads from external_reviews_cache
// (populated daily by /api/cron/sync-reviews + on demand from
// /admin/reviews → "Refresh now"), so a Vercel cold start never costs
// an upstream Google Places call. Returns the same {reviews, rating,
// total} shape the homepage badge component (YelpReviews.tsx) already
// expected when this route hit Google live.

export async function GET() {
  const cached = await readCachedReviews("google");
  if (cached) return apiSuccess(cached);
  return apiSuccess({ reviews: [], rating: null, total: null });
}
