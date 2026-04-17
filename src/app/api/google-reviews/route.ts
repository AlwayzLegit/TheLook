import { apiSuccess, logError } from "@/lib/apiResponse";

// Cache reviews for 6 hours
let cache: { data: unknown; expires: number } | null = null;
const CACHE_DURATION = 6 * 60 * 60 * 1000;

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    // Fall back to no reviews if not configured
    return apiSuccess({ reviews: [], rating: null, total: null });
  }

  // Return cached if valid
  if (cache && cache.expires > Date.now()) {
    return apiSuccess(cache.data);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&key=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data.status !== "OK") {
      return apiSuccess({ reviews: [], rating: null, total: null });
    }

    const result = {
      reviews: (data.result?.reviews || []).slice(0, 5).map((r: {
        author_name: string; profile_photo_url: string; rating: number; text: string; time: number; relative_time_description: string;
      }) => ({
        author: r.author_name,
        authorPhoto: r.profile_photo_url,
        rating: r.rating,
        text: r.text,
        time: r.time,
        relative: r.relative_time_description,
      })),
      rating: data.result?.rating,
      total: data.result?.user_ratings_total,
    };

    cache = { data: result, expires: Date.now() + CACHE_DURATION };
    return apiSuccess(result);
  } catch (err) {
    logError("google-reviews GET", err);
    return apiSuccess({ reviews: [], rating: null, total: null });
  }
}
