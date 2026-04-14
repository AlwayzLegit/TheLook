import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminStylistSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json();
  const parsed = adminStylistSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid stylist payload.", 400);
  }
  const payload = parsed.data;

  const updateData: Record<string, unknown> = {
    name: payload.name,
    bio: payload.bio,
    image_url: payload.image_url,
    specialties: payload.specialties,
    active: payload.active,
    sort_order: payload.sort_order,
    updated_at: new Date().toISOString(),
  };

  if (payload.name) {
    updateData.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const { data, error } = await supabase
    .from("stylists")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logError("admin/stylists PATCH", error);
    return apiError("Failed to update stylist.", 500);
  }

  logAdminAction("stylist.update", JSON.stringify({ id, name: payload.name }));

  return apiSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;

  const { error } = await supabase
    .from("stylists")
    .delete()
    .eq("id", id);

  if (error) {
    logError("admin/stylists DELETE", error);
    return apiError("Failed to delete stylist.", 500);
  }

  logAdminAction("stylist.delete", JSON.stringify({ id }));

  return apiSuccess({ success: true });
}
