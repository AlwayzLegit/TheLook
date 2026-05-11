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

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  const gate = await requirePermission("manage_catalog");
  if (!gate.ok) return gate.response;

  if (!hasSupabaseConfig) {
    return apiSuccess([]);
  }

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logError("admin/services GET", error);
    return apiError("Failed to fetch services.", 500);
  }

  return apiSuccess(data);
}

export async function POST(request: NextRequest) {
  // Round-13: managers can create services too. Round-9 had this
  // locked to admin-only based on a strict QA interpretation, but
  // adding new menu items is a routine ops task the salon manager
  // does without needing the owner online. Editing + deleting via
  // the per-id route stays at the existing isAdminOrManager gate.
  const gate = await requirePermission("manage_catalog", request);
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = adminServiceSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = (first?.path || []).join(".");
    const msg = first?.message || "validation failed";
    return apiError(`Invalid ${path || "payload"}: ${msg}`, 400);
  }
  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }
  const payload = parsed.data;
  // Auto-slug from name when the admin didn't provide one. Slug clashes in
  // the backfill migration use a 6-char uuid suffix; same policy here.
  const baseSlug = (payload.slug && payload.slug.trim().length > 0)
    ? payload.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const basePayload = {
    category: payload.category,
    // Empty-string from the dropdown collapses to null so the DB
    // column stays cleanly nullable (the home gallery branches on
    // null/non-null for the un-split fallback).
    subcategory: payload.subcategory && payload.subcategory.trim().length > 0
      ? payload.subcategory.trim()
      : null,
    name: payload.name,
    slug: baseSlug,
    price_text: payload.price_text,
    price_min: payload.price_min,
    duration: payload.duration,
    description: payload.description ?? null,
    products_used: payload.products_used ?? null,
    active: payload.active ?? true,
    sort_order: payload.sort_order ?? 0,
  };

  let data;
  let error;
  ({ data, error } = await supabase
    .from("services")
    .insert({
      ...basePayload,
      image_url: payload.image_url || null,
    })
    .select()
    .single());

  // Backward compatibility for databases that do not yet have services.image_url.
  if (error && (error.message || "").toLowerCase().includes("image_url")) {
    ({ data, error } = await supabase
      .from("services")
      .insert(basePayload)
      .select()
      .single());
  }

  if (error) {
    logError("admin/services POST", error);
    return apiError(`Failed to create service: ${error.message || "unknown"}`, 500);
  }

  await logAdminAction("service.create", JSON.stringify({ name: payload.name }));
  revalidatePublic();

  return apiSuccess(data, 201);
}
