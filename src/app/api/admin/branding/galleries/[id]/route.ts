import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/auditLog";
import { HOME_GALLERY_CACHE_TAG } from "@/lib/homeGallery";
import { revalidateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { NextRequest } from "next/server";

const patchSchema = z
  .object({
    image_url: z.string().trim().min(1).max(2000).optional(),
    alt: z.string().trim().max(200).nullable().optional(),
    sort_order: z.number().int().min(0).max(1000).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");

function bustCaches() {
  revalidateTag(HOME_GALLERY_CACHE_TAG);
  try {
    revalidatePath("/");
  } catch {
    /* best-effort */
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(`Invalid payload: ${first?.message || "validation failed"}`, 400);
  }

  const { data, error } = await supabase
    .from("home_section_images")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    logError("admin/branding/galleries PATCH", error);
    return apiError(`Failed to update photo: ${error.message || "unknown"}`, 500);
  }

  bustCaches();
  await logAdminAction(
    "branding.gallery.update",
    JSON.stringify({ id, fields: Object.keys(parsed.data), actor: gate.user.email }),
  );
  return apiSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrManager(request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const { error } = await supabase.from("home_section_images").delete().eq("id", id);
  if (error) {
    logError("admin/branding/galleries DELETE", error);
    return apiError(`Failed to delete photo: ${error.message || "unknown"}`, 500);
  }

  bustCaches();
  await logAdminAction(
    "branding.gallery.delete",
    JSON.stringify({ id, actor: gate.user.email }),
  );
  return apiSuccess({ ok: true });
}
