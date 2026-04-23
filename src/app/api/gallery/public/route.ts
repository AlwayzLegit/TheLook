import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiSuccess, logError } from "@/lib/apiResponse";

// Public read — returns the active gallery grid items + before/after pairs
// the owner has published through /admin/gallery. Both lists are sorted
// ascending by sort_order. Never throws: if Supabase is down or the tables
// don't exist yet (pre-migration env) we return empty arrays so the
// consumer components fall back cleanly.
export const revalidate = 60;

export async function GET() {
  if (!hasSupabaseConfig) {
    return apiSuccess({ items: [], pairs: [] });
  }
  try {
    const [itemsRes, pairsRes] = await Promise.all([
      supabase
        .from("gallery_items")
        .select("id, image_url, title, caption, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("gallery_before_after")
        .select("id, before_url, after_url, caption, alt, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);
    return apiSuccess({
      items: itemsRes.data || [],
      pairs: pairsRes.data || [],
    });
  } catch (err) {
    logError("gallery/public", err);
    return apiSuccess({ items: [], pairs: [] });
  }
}
