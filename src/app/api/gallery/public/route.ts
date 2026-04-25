import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiSuccess, logError } from "@/lib/apiResponse";

// Public read — returns the active gallery grid items, before/after pairs,
// and inspiration tiles the owner has published through /admin/gallery.
// All three lists are sorted ascending by sort_order. Never throws: if
// Supabase is down or a table hasn't migrated yet we return empty arrays
// so consumer components fall back cleanly.
export const revalidate = 60;

export async function GET() {
  if (!hasSupabaseConfig) {
    return apiSuccess({ items: [], pairs: [], inspiration: [] });
  }
  try {
    const [itemsRes, pairsRes, inspirationRes] = await Promise.all([
      supabase
        .from("gallery_items")
        .select("id, image_url, title, caption, stylist_id, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("gallery_before_after")
        .select("id, before_url, after_url, caption, alt, stylist_id, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      // Pre-migration envs won't have this table yet — the Promise.all
      // still resolves but inspirationRes.error is set. We coerce that
      // to an empty array so the public page degrades gracefully.
      supabase
        .from("gallery_inspiration")
        .select("id, image_url, title, caption, category, gender, source, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);
    // If the gallery_*.stylist_id column hasn't migrated yet (20260511
    // not run), the select fails. Retry without the column so the
    // public page still loads. itemsRes / pairsRes will not have
    // stylist_id in that case — filtering by stylist will simply
    // return no rows on the client.
    let items = itemsRes.data;
    let pairs = pairsRes.data;
    if (itemsRes.error && /stylist_id/i.test(itemsRes.error.message || "")) {
      const retry = await supabase
        .from("gallery_items")
        .select("id, image_url, title, caption, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      items = retry.data;
    }
    if (pairsRes.error && /stylist_id/i.test(pairsRes.error.message || "")) {
      const retry = await supabase
        .from("gallery_before_after")
        .select("id, before_url, after_url, caption, alt, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      pairs = retry.data;
    }
    return apiSuccess({
      items: items || [],
      pairs: pairs || [],
      inspiration: inspirationRes.data || [],
    });
  } catch (err) {
    logError("gallery/public", err);
    return apiSuccess({ items: [], pairs: [], inspiration: [] });
  }
}
