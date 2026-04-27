import { NextRequest } from "next/server";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { syncExternalReviews } from "@/lib/externalReviewsSync";
import { logAdminAction } from "@/lib/auditLog";

// Daily Vercel cron — refreshes the Google Places + Yelp Fusion
// payloads into external_reviews_cache. Hobby plan caps us at 2 crons
// total; this fits inside that budget alongside /api/cron/reminders.
//
// Auth: shares CRON_SECRET with the reminders cron. Vercel injects
// `Authorization: Bearer ${CRON_SECRET}` automatically when calling the
// path declared in vercel.json. Manual probes from the public internet
// without that header get 401.

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  try {
    const results = await syncExternalReviews();
    // Audit the run so /admin/activity shows the daily refresh and
    // any partial failures (one source ok, the other 5xx).
    await logAdminAction(
      "reviews.sync.cron",
      JSON.stringify({
        results: results.map((r) => ({
          source: r.source,
          ok: r.ok,
          rating: r.rating ?? null,
          total: r.total ?? null,
          reviewCount: r.reviewCount ?? 0,
          error: r.error || null,
        })),
      }),
    ).catch(() => {});
    const anyFailed = results.some((r) => !r.ok);
    return apiSuccess({ ok: !anyFailed, results });
  } catch (err) {
    logError("cron/sync-reviews", err);
    return apiError("Sync failed.", 500);
  }
}
