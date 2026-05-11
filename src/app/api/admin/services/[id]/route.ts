import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/apiAuth";
import { adminServiceSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

function revalidatePublic() {
  try {
    revalidatePath("/");
    revalidatePath("/services");
    revalidatePath("/services/[slug]", "page");
    revalidatePath("/book");
  } catch {
    // Best-effort.
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_catalog", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json();
  const parsed = adminServiceSchema.safeParse(body);
  if (!parsed.success) {
    // Surface the specific field error so the admin can fix it instead
    // of staring at "Invalid service payload".
    const first = parsed.error.issues[0];
    const path = (first?.path || []).join(".");
    const msg = first?.message || "validation failed";
    return apiError(`Invalid ${path || "payload"}: ${msg}`, 400);
  }
  const payload = parsed.data;
  const slugSource = payload.slug && payload.slug.trim().length > 0 ? payload.slug : payload.name;
  const nextSlug = slugSource.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const basePayload = {
    category: payload.category,
    // Empty-string from the dropdown collapses to null — see comment
    // in the create route.
    subcategory: payload.subcategory && payload.subcategory.trim().length > 0
      ? payload.subcategory.trim()
      : null,
    name: payload.name,
    slug: nextSlug,
    price_text: payload.price_text,
    price_min: payload.price_min,
    duration: payload.duration,
    description: payload.description ?? null,
    products_used: payload.products_used ?? null,
    // Per-service framing fields. Migration 20260522 adds the columns;
    // older DBs get a graceful fallback below mirroring the image_url
    // pattern.
    what_to_expect: payload.what_to_expect ?? null,
    recommended_frequency: payload.recommended_frequency ?? null,
    pair_with: payload.pair_with ?? null,
    active: payload.active,
    sort_order: payload.sort_order,
    updated_at: new Date().toISOString(),
  };

  let data;
  let error;
  ({ data, error } = await supabase
    .from("services")
    .update({
      ...basePayload,
      image_url: payload.image_url || null,
    })
    .eq("id", id)
    .select()
    .single());

  // Backward compatibility for databases missing newer columns.
  if (error && (error.message || "").toLowerCase().includes("image_url")) {
    ({ data, error } = await supabase
      .from("services")
      .update(basePayload)
      .eq("id", id)
      .select()
      .single());
  }
  if (
    error &&
    /what_to_expect|recommended_frequency|pair_with/.test((error.message || "").toLowerCase())
  ) {
    const withoutFraming = { ...basePayload };
    delete (withoutFraming as Partial<typeof basePayload>).what_to_expect;
    delete (withoutFraming as Partial<typeof basePayload>).recommended_frequency;
    delete (withoutFraming as Partial<typeof basePayload>).pair_with;
    ({ data, error } = await supabase
      .from("services")
      .update({
        ...withoutFraming,
        image_url: payload.image_url || null,
      })
      .eq("id", id)
      .select()
      .single());
  }

  if (error) {
    logError("admin/services PATCH", error);
    return apiError(`Failed to update service: ${error.message || "unknown"}`, 500);
  }

  await logAdminAction("service.update", JSON.stringify({ id, name: payload.name }));
  revalidatePublic();

  return apiSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_catalog", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id);

  if (error) {
    logError("admin/services DELETE", error);
    return apiError(`Failed to delete service: ${error.message || "unknown"}`, 500);
  }

  await logAdminAction("service.delete", JSON.stringify({ id }));
  revalidatePublic();

  return apiSuccess({ success: true });
}
