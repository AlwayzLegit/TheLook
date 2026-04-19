import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

const variantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price_text: z.string().trim().min(1).max(50),
  price_min: z.number().int().min(0).max(1_000_000),
  duration: z.number().int().min(1).max(600),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
});

const replaceAllSchema = z.array(
  variantSchema.extend({
    id: z.string().uuid().optional(),
  }),
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSupabaseConfig) return apiSuccess([]);
  const { id } = await params;
  const { data, error } = await supabase
    .from("service_variants")
    .select("*")
    .eq("service_id", id)
    .order("sort_order", { ascending: true });
  if (error) {
    logError("variants GET", error);
    return apiError(`Failed to load variants: ${error.message}`, 500);
  }
  return apiSuccess(data || []);
}

// PUT replaces the entire variant set for a service. Easiest UI flow because
// admins can add/remove rows in one shot.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);
  const { id } = await params;

  const body = await request.json();
  const parsed = replaceAllSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(`Invalid variants payload: ${parsed.error.issues[0]?.message}`, 400);
  }

  const variants = parsed.data;

  // Verify service exists.
  const { data: svc, error: svcErr } = await supabase
    .from("services")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (svcErr || !svc) return apiError("Service not found.", 404);

  // Wipe and re-insert. Simpler than diffing — variants are tiny.
  const { error: delErr } = await supabase.from("service_variants").delete().eq("service_id", id);
  if (delErr) {
    logError("variants PUT (delete)", delErr);
    return apiError(`Failed to clear variants: ${delErr.message}`, 500);
  }

  if (variants.length > 0) {
    const rows = variants.map((v, i) => ({
      service_id: id,
      name: v.name,
      price_text: v.price_text,
      price_min: v.price_min,
      duration: v.duration,
      active: v.active ?? true,
      sort_order: v.sort_order ?? i,
    }));
    const { error: insErr } = await supabase.from("service_variants").insert(rows);
    if (insErr) {
      logError("variants PUT (insert)", insErr);
      return apiError(`Failed to save variants: ${insErr.message}`, 500);
    }
  }

  await logAdminAction("service.variants.update", JSON.stringify({ id, count: variants.length }));
  try {
    revalidatePath("/services");
    revalidatePath("/book");
  } catch {}

  return apiSuccess({ ok: true, count: variants.length });
}
