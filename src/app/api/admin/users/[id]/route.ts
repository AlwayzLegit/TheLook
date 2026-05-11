import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { getSessionUser } from "@/lib/roles";
import { sanitizePermissions } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

// Self-edit guard helpers. Owner asked for: you can't deactivate
// yourself OR remove your own manage_users permission, otherwise a
// distracted admin can lock the only-admin account out of /admin/users
// in a single edit and need a DB hand-fix.
async function isSelfEdit(targetId: string): Promise<boolean> {
  const me = await getSessionUser();
  if (!me) return false;
  if (!hasSupabaseConfig) return false;
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", me.email.toLowerCase())
    .maybeSingle();
  return ((data as { id?: string } | null)?.id || null) === targetId;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePermission("manage_users", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.title !== undefined) {
    updateData.title =
      typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  }
  if (body.role !== undefined) {
    // Server-side allow-list — admin UI is already constrained but a
    // stray client call with role="anything" would otherwise trip the
    // DB check constraint with a cryptic 500.
    if (body.role !== "admin" && body.role !== "manager" && body.role !== "stylist") {
      return apiError("Invalid role.", 400);
    }
    updateData.role = body.role;
  }
  if (body.permissions !== undefined) {
    updateData.permissions = sanitizePermissions(body.permissions);
  }
  if (body.stylistId !== undefined) updateData.stylist_id = body.stylistId || null;
  if (body.active !== undefined) updateData.active = body.active;
  if (body.password) {
    updateData.password_hash = await bcrypt.hash(body.password, 14);
  }

  // Self-edit guards — only kick in when the row being patched is the
  // caller's own row. Saves an admin from accidentally locking
  // themselves out (we've all done it once).
  const isSelf = await isSelfEdit(id);
  if (isSelf) {
    if (updateData.active === false) {
      return apiError("You can't deactivate your own account.", 400);
    }
    if (Array.isArray(updateData.permissions)) {
      const perms = updateData.permissions as string[];
      if (!perms.includes("manage_users")) {
        return apiError(
          "You can't remove your own \"Manage users\" permission — ask another admin to do it.",
          400,
        );
      }
    }
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update(updateData)
    .eq("id", id)
    .select("id, email, name, role, stylist_id, active, title, permissions")
    .single();

  if (error) {
    logError("admin/users PATCH", error);
    return apiError("Failed to update user.", 500);
  }

  logAdminAction("user.update", JSON.stringify({ id, changes: Object.keys(updateData) }));
  return apiSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requirePermission("manage_users", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { id } = await params;

  // Same idea as the PATCH self-edit guard — block self-delete so a
  // stray click doesn't kill the only-admin account.
  if (await isSelfEdit(id)) {
    return apiError("You can't delete your own account.", 400);
  }

  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) {
    logError("admin/users DELETE", error);
    return apiError("Failed to delete user.", 500);
  }

  logAdminAction("user.delete", JSON.stringify({ id }));
  return apiSuccess({ success: true });
}
