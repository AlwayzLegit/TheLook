import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/auditLog";
import { HOME_GALLERY_CACHE_TAG } from "@/lib/homeGallery";
import { revalidateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { NextRequest } from "next/server";

// Bulk reorder. Caller sends an ordered list of row IDs (typically
// just the IDs in one section the way /admin/branding renders them);
// we set each row's sort_order to its index in the array.

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(`Invalid reorder payload: ${first?.message || "validation failed"}`, 400);
  }

  const { ids } = parsed.data;
  const failures: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("home_section_images")
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq("id", ids[i]);
    if (error) failures.push(`${ids[i]}: ${error.message}`);
  }

  if (failures.length > 0) {
    logError("admin/branding/galleries/reorder", failures.join(" | "));
    return apiError(`Failed to reorder ${failures.length} of ${ids.length} rows.`, 500);
  }

  revalidateTag(HOME_GALLERY_CACHE_TAG);
  try {
    revalidatePath("/");
  } catch {
    /* best-effort */
  }

  await logAdminAction(
    "branding.gallery.reorder",
    JSON.stringify({ count: ids.length, actor: gate.user.email }),
  );
  return apiSuccess({ ok: true });
}
