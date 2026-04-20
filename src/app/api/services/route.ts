import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig) {
    return apiSuccess({});
  }

  // B-08: when ?include=variants is set, embed each service's variants in
  // the response so /book doesn't need an N+1 fan-out call per service.
  const includeVariants = request.nextUrl.searchParams.get("include") === "variants";

  const { data: allServices, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    logError("services GET", error);
    return apiError("Failed to fetch services.", 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variantsByService = new Map<string, any[]>();
  if (includeVariants) {
    const ids = (allServices || []).map((s: { id: string }) => s.id);
    if (ids.length > 0) {
      const { data: variants, error: vErr } = await supabase
        .from("service_variants")
        .select("id, service_id, name, price_text, price_min, duration, sort_order")
        .in("service_id", ids)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (vErr) {
        logError("services GET (variants)", vErr);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const v of (variants || []) as any[]) {
          const list = variantsByService.get(v.service_id) || [];
          list.push(v);
          variantsByService.set(v.service_id, list);
        }
      }
    }
  }

  // Group by category. Each service carries its variants array when the
  // include flag was set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped: Record<string, any[]> = {};
  for (const s of allServices || []) {
    if (!grouped[s.category]) grouped[s.category] = [];
    if (includeVariants) {
      grouped[s.category].push({ ...s, variants: variantsByService.get(s.id) || [] });
    } else {
      grouped[s.category].push(s);
    }
  }

  return apiSuccess(grouped);
}
