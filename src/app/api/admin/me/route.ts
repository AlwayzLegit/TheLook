import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userCanAccessAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

// /api/admin/me — the signed-in user's own profile row. Returned + edited
// by /admin/profile. Distinct from /api/admin/users (admin-only CRUD for
// OTHER users) so a manager can update their own bio + photo without
// needing admin privileges.

const EDITABLE_FIELDS = new Set([
  "name",
  "title",
  "bio",
  "image_url",
  "slug",
  "active_for_public",
  "sort_order",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!userCanAccessAdmin(user)) return apiError("Access denied.", 403);
  if (!hasSupabaseConfig) return apiSuccess(null);

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, name, role, title, bio, image_url, slug, active_for_public, sort_order")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  if (error) {
    logError("admin/me GET", error);
    return apiError("Failed to load profile.", 500);
  }
  return apiSuccess(data);
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!userCanAccessAdmin(user)) return apiError("Access denied.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE_FIELDS.has(k)) continue;
    // Empty strings for nullable display fields collapse to NULL so the
    // UI can "unset" a value cleanly.
    if ((k === "title" || k === "bio" || k === "image_url" || k === "slug") && v === "") {
      update[k] = null;
      continue;
    }
    update[k] = v;
  }

  // Auto-slug from name if the user hasn't set one but turned their
  // profile public — saves the owner from typing a slug to ship.
  if (update.active_for_public === true && !update.slug) {
    const baseName = typeof update.name === "string" && update.name ? update.name : user.name;
    if (baseName) update.slug = slugify(baseName);
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update(update)
    .eq("email", user.email.toLowerCase())
    .select("id, email, name, role, title, bio, image_url, slug, active_for_public, sort_order")
    .single();

  if (error || !data) {
    logError("admin/me PATCH", error || { message: "no row" });
    return apiError(`Failed to update profile: ${error?.message || "no matching row"}`, 500);
  }

  logAdminAction("me.profile_update", JSON.stringify({ email: user.email, keys: Object.keys(update) }));
  try {
    // Public /team page reads from this table — bust the static cache so
    // toggling active_for_public reflects immediately.
    revalidatePath("/team");
    revalidatePath("/stylists"); // legacy redirect target, safe to poke
  } catch {
    // best-effort
  }
  return apiSuccess(data);
}
