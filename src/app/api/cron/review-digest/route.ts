import { sendReviewDigestEmail } from "@/lib/email";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

interface ApiReview {
  author: string;
  rating: number;
  text: string;
  time: number;
  relative: string;
  url?: string;
}
interface Payload {
  reviews: ApiReview[];
  rating: number | null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  const weekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;

  try {
    const [gRes, yRes] = await Promise.all([
      fetch(`${baseUrl}/api/google-reviews`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/yelp-reviews`, { cache: "no-store" }),
    ]);
    const g: Payload = gRes.ok ? await gRes.json() : { reviews: [], rating: null };
    const y: Payload = yRes.ok ? await yRes.json() : { reviews: [], rating: null };

    const items = [
      ...(g.reviews || []).filter((r) => r.time >= weekAgo).map((r) => ({ ...r, source: "Google" as const })),
      ...(y.reviews || []).filter((r) => r.time >= weekAgo).map((r) => ({ ...r, source: "Yelp" as const })),
    ].sort((a, b) => b.time - a.time);

    if (items.length === 0) {
      return apiSuccess({ sent: 0, reason: "No new reviews this week." });
    }

    await sendReviewDigestEmail(
      items.map((r) => ({
        source: r.source,
        author: r.author,
        rating: r.rating,
        text: r.text,
        relative: r.relative,
        url: r.url,
      })),
      {
        google: g.rating ? g.rating.toFixed(1) : "",
        yelp: y.rating ? y.rating.toFixed(1) : "",
      },
    );

    return apiSuccess({ sent: items.length });
  } catch (err) {
    logError("cron/review-digest GET", err);
    return apiError("Failed to send digest.", 500);
  }
}
