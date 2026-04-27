import { NextRequest } from "next/server";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { requireAdminOrManager, requireAdmin } from "@/lib/apiAuth";
import { syncExternalReviews, readCacheStatus } from "@/lib/externalReviewsSync";
import { logAdminAction } from "@/lib/auditLog";

// GET   /api/admin/reviews/external  → status rows (last sync, last error per source)
// POST  /api/admin/reviews/external  → manual sync (admin-only — managers can read but not refresh)
//
// The cron path lives at /api/cron/sync-reviews and uses CRON_SECRET;
// this admin path uses session auth so /admin/reviews can wire a
// "Refresh now" button without minting a new token.

export async function GET() {
  // Admin or manager — both should see whether reviews are stale.
  const gate = await requireAdminOrManager();
  if (!gate.ok) return gate.response;
  const rows = await readCacheStatus();
  return apiSuccess({ rows });
}

export async function POST(request: NextRequest) {
  // Manual refresh hits the upstream APIs immediately; it counts
  // against the daily Google quota, so admin-only.
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  try {
    const results = await syncExternalReviews();
    await logAdminAction(
      "reviews.sync.manual",
      JSON.stringify({
        actor: gate.user.email,
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
    return apiSuccess({ ok: !results.some((r) => !r.ok), results });
  } catch (err) {
    logError("admin/reviews/external POST", err);
    return apiError("Sync failed.", 500);
  }
}
