import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { requirePermission } from "@/lib/apiAuth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NextRequest } from "next/server";

// Bulk reorder. Caller sends an ordered list of service IDs (typically
// just the IDs in one category, the way /admin/services renders them);
// we set each row's sort_order to its index in the array.
//
// Per-row updates instead of a single CASE WHEN UPDATE because the
// supabase-js client doesn't expose raw SQL cleanly. N is bounded by
// the schema (max 200) so the loop is fine.

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export async function POST(request: NextRequest) {
  const gate = await requirePermission("manage_catalog", request);
  if (!gate.ok) return gate.response;
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(
      `Invalid reorder payload: ${first?.message || "validation failed"}`,
      400,
    );
  }

  const { ids } = parsed.data;
  const failures: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("services")
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq("id", ids[i]);
    if (error) failures.push(`${ids[i]}: ${error.message}`);
  }

  if (failures.length > 0) {
    logError("admin/services/reorder", failures.join(" | "));
    return apiError(
      `Failed to reorder ${failures.length} of ${ids.length} services.`,
      500,
    );
  }

  await logAdminAction("service.reorder", JSON.stringify({ count: ids.length }));

  // Bust the public ISR caches so the new order shows up on the live
  // site immediately rather than after the next 60s revalidate.
  try {
    revalidatePath("/");
    revalidatePath("/services");
    revalidatePath("/book");
  } catch {
    /* best-effort */
  }

  return apiSuccess({ ok: true });
}
