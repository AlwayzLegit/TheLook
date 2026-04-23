import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!isAdmin(user)) return apiError("Admin access required.", 403);
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, name, role, stylist_id, active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    logError("admin/users GET", error);
    return apiError("Failed to fetch users.", 500);
  }

  return apiSuccess(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!isAdmin(user)) return apiError("Admin access required.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json();
  if (!body.email || !body.password || !body.name) {
    return apiError("Email, password, and name are required.", 400);
  }

  // Default to "admin" — historical behavior before the manager role
  // landed. Callers must explicitly pass "manager" to create a manager.
  // "stylist" is accepted for forward compat but no login surface uses it.
  const role: "admin" | "manager" | "stylist" = (() => {
    if (body.role === "manager" || body.role === "stylist") return body.role;
    return "admin";
  })();

  const passwordHash = await bcrypt.hash(body.password, 12);

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email: body.email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: body.name,
      role,
      stylist_id: body.stylistId || null,
      active: body.active ?? true,
    })
    .select("id, email, name, role, stylist_id, active")
    .single();

  if (error) {
    logError("admin/users POST", error);
    if (error.message?.includes("unique")) {
      return apiError("A user with this email already exists.", 409);
    }
    return apiError("Failed to create user.", 500);
  }

  logAdminAction("user.create", JSON.stringify({ email: body.email, role: body.role }));
  return apiSuccess(data, 201);
}
