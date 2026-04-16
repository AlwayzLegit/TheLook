import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!isAdmin(user)) return apiError("Admin access required.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.stylistId !== undefined) updateData.stylist_id = body.stylistId || null;
  if (body.active !== undefined) updateData.active = body.active;
  if (body.password) {
    updateData.password_hash = await bcrypt.hash(body.password, 12);
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update(updateData)
    .eq("id", id)
    .select("id, email, name, role, stylist_id, active")
    .single();

  if (error) {
    logError("admin/users PATCH", error);
    return apiError("Failed to update user.", 500);
  }

  logAdminAction("user.update", JSON.stringify({ id, changes: Object.keys(updateData) }));
  return apiSuccess(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!isAdmin(user)) return apiError("Admin access required.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;

  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) {
    logError("admin/users DELETE", error);
    return apiError("Failed to delete user.", 500);
  }

  logAdminAction("user.delete", JSON.stringify({ id }));
  return apiSuccess({ success: true });
}
