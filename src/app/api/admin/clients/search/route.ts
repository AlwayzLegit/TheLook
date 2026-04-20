import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// Typeahead endpoint. Returns up to 10 matches on name / email / phone,
// keyed for display in the search suggestion dropdown.
//
// Tuned for very short queries (3+ chars) — below that we return empty
// to avoid sending the whole directory over the wire on every keystroke.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess({ results: [] });

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return apiSuccess({ results: [] });

  const like = `%${q.replace(/[%_]/g, "")}%`;
  // Strip non-digits for phone search so "(818) 555" matches "+18185551234"
  // equally well.
  const digits = q.replace(/\D/g, "");
  const phoneLike = digits.length >= 3 ? `%${digits}%` : null;

  const filters = [
    `name.ilike.${like}`,
    `email.ilike.${like}`,
  ];
  if (phoneLike) filters.push(`phone.ilike.${phoneLike}`);

  const { data, error } = await supabase
    .from("client_profiles")
    .select("email, name, phone, banned")
    .or(filters.join(","))
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    logError("admin/clients/search GET", error);
    return apiError("Search failed.", 500);
  }

  return apiSuccess({ results: data || [] });
}
