import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminStylistSchema } from "@/lib/validation";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("stylists")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logError("admin/stylists GET", error);
    return apiError("Failed to fetch stylists.", 500);
  }

  return apiSuccess(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = adminStylistSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid stylist payload.", 400);
  }
  const payload = parsed.data;

  const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { data, error } = await supabase
    .from("stylists")
    .insert({
      name: payload.name,
      slug: slug,
      bio: payload.bio,
      image_url: payload.image_url,
      specialties: payload.specialties,
      active: payload.active ?? true,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    logError("admin/stylists POST", error);
    return apiError("Failed to create stylist.", 500);
  }

  logAdminAction("stylist.create", JSON.stringify({ name: payload.name }));

  return apiSuccess(data, 201);
}
