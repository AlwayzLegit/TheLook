import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { sanitizePermissions, type Permission } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

// /admin/users CRUD. Round-26: the legacy role enum became a free-form
// title + a permissions array. Existing callers that only send `role`
// still work — we derive a permission set from the role on POST, but
// new callers should send `permissions: string[]` directly. The
// stylist link (stylist_id) only matters when the user has a public
// stylist profile to attach to; it doesn't gate any permission.

export async function GET() {
  const gate = await requirePermission("manage_users");
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, name, role, stylist_id, active, title, permissions, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    logError("admin/users GET", error);
    return apiError("Failed to fetch users.", 500);
  }

  return apiSuccess(data || []);
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission("manage_users", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  if (!body.email || !body.password || !body.name) {
    return apiError("Email, password, and name are required.", 400);
  }

  // The legacy role enum is preserved on every row so existing reports +
  // session-derived defaults still work. Default is "manager" when the
  // caller doesn't specify — admin is now created explicitly through
  // either a "role" body field or by ticking manage_users in the perms.
  const role: "admin" | "manager" | "stylist" = (() => {
    if (body.role === "admin" || body.role === "manager" || body.role === "stylist") {
      return body.role;
    }
    return "manager";
  })();

  // Permission array. Caller may send a custom permission set; otherwise
  // we derive from the role so a quick "create a manager" call still
  // produces a usable account.
  const permissions: Permission[] = (() => {
    if (Array.isArray(body.permissions)) return sanitizePermissions(body.permissions);
    if (role === "admin") {
      return [
        "manage_users", "manage_settings", "view_analytics",
        "manage_bookings", "manage_clients", "manage_content",
        "manage_catalog", "manage_team",
      ];
    }
    if (role === "manager") {
      return [
        "manage_settings", "view_analytics",
        "manage_bookings", "manage_clients", "manage_content",
        "manage_catalog", "manage_team",
      ];
    }
    return [];
  })();

  const title: string | null =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;

  // Cost 14 — 2026 baseline for bcrypt, ~1-2s per hash on modern hardware.
  const passwordHash = await bcrypt.hash(body.password, 14);

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email: body.email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: body.name,
      role,
      title,
      permissions,
      stylist_id: body.stylistId || null,
      active: body.active ?? true,
    })
    .select("id, email, name, role, stylist_id, active, title, permissions")
    .single();

  if (error) {
    logError("admin/users POST", error);
    if (error.message?.includes("unique")) {
      return apiError("A user with this email already exists.", 409);
    }
    return apiError("Failed to create user.", 500);
  }

  logAdminAction(
    "user.create",
    JSON.stringify({ email: body.email, role, title, permissions }),
  );
  return apiSuccess(data, 201);
}
