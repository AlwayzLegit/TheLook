import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/auditLog";
import {
  BRANDING_CACHE_TAG,
  BRANDING_WRITE_KEYS,
} from "@/lib/branding";
import { revalidateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

// Owner-controllable image overrides for the public site. Lives in
// salon_settings under the BRANDING_IMAGE_KEYS whitelist so the
// admin /admin/branding page (and managers — this is operational,
// not security-sensitive) can swap the home hero, about photo,
// footer background, and the four service-category hero banners
// without touching code or the broader /admin/settings surface.
//
// Why a separate endpoint from /api/admin/settings:
//   - /admin/settings stays admin-only (it touches SMS toggles,
//     security TTL, notifications — real boundaries).
//   - /admin/branding is admin-or-manager so the salon manager
//     can refresh photos when a stylist takes a new shot of their
//     work, without bouncing every change through the owner.
//
// Both endpoints write to the same salon_settings table; the
// branding endpoint just whitelists a different (smaller, image-
// only) key set.

const ALLOWED_KEYS = new Set<string>(BRANDING_WRITE_KEYS);

export async function GET() {
  const gate = await requireAdminOrManager();
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess({});

  const { data, error } = await supabase
    .from("salon_settings")
    .select("key, value")
    .in("key", BRANDING_WRITE_KEYS as unknown as string[]);
  if (error) {
    logError("admin/branding GET", error);
    return apiError("Failed to load branding.", 500);
  }
  const out: Record<string, string | null> = {};
  for (const row of (data || []) as Array<{ key: string; value: string | null }>) {
    out[row.key] = row.value;
  }
  return apiSuccess(out);
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const updates = body as Record<string, string | null>;
  const rows: Array<{ key: string; value: string; updated_at: string }> = [];
  // Per-key validation. Round-14 QA caught the four review-badge
  // keys accepting negative numbers + non-numeric strings — the
  // public render path's `pickNumber` filter masked it but the
  // DB was left holding garbage. We now reject at write time so
  // the next reader (admin UI, future migration, etc.) doesn't
  // have to know about the trap. Image keys stay loose because
  // an empty string clears the override and any other string is
  // treated as a URL the consumer renders inside <Image>.
  const ratingKeys = new Set(["yelp_rating", "google_rating"]);
  const countKeys = new Set(["yelp_total", "google_total"]);
  for (const [key, value] of Object.entries(updates)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    const raw = value == null ? "" : String(value).trim();
    // Empty always clears (lets the owner reset to fallback).
    if (raw !== "") {
      if (ratingKeys.has(key)) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 5) {
          return apiError(
            `Invalid value for ${key}: must be a number between 0 and 5 (got "${raw}").`,
            400,
          );
        }
      } else if (countKeys.has(key)) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
          return apiError(
            `Invalid value for ${key}: must be a non-negative whole number (got "${raw}").`,
            400,
          );
        }
      }
      // Image-URL keys: keep the loose check from before. Any
      // other value just stores as-is.
    }
    rows.push({
      key,
      value: raw,
      updated_at: new Date().toISOString(),
    });
  }
  if (rows.length === 0) return apiError("Nothing to update.", 400);

  const { error } = await supabase.from("salon_settings").upsert(rows);
  if (error) {
    logError("admin/branding PATCH", error);
    return apiError("Failed to save branding.", 500);
  }

  // Bust the branding cache so the public site picks up the new
  // images on the next render instead of waiting up to 60s.
  revalidateTag(BRANDING_CACHE_TAG);
  // Also bust the home page + each service category page since they
  // each render one or more of these images.
  try {
    revalidatePath("/");
    revalidatePath("/services");
    revalidatePath("/services/haircuts");
    revalidatePath("/services/color");
    revalidatePath("/services/styling");
    revalidatePath("/services/treatments");
  } catch {
    /* best-effort */
  }

  await logAdminAction(
    "branding.update",
    JSON.stringify({ keys: rows.map((r) => r.key), actor: gate.user.email }),
  );

  return apiSuccess({ ok: true, updated: rows.length });
}
