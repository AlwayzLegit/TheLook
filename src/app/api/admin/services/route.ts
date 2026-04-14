import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminServiceSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

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
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = adminServiceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid service payload.", 400);
  }
  if (!hasSupabaseConfig) {
    return apiError("Database not configured.", 503);
  }
  const payload = parsed.data;
  const basePayload = {
    category: payload.category,
    name: payload.name,
    price_text: payload.price_text,
    price_min: payload.price_min,
    duration: payload.duration,
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
    return apiError("Failed to create service.", 500);
  }

  logAdminAction("service.create", JSON.stringify({ name: payload.name }));

  return apiSuccess(data, 201);
}
