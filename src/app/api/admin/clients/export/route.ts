import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, logError } from "@/lib/apiResponse";

// CSV export of every client_profile row. Columns match the import
// endpoint's expected input so re-importing an export round-trips cleanly.

function csvEscape(v: string | null | undefined): string {
  const s = (v ?? "").toString();
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { data, error } = await supabase
    .from("client_profiles")
    .select("email, name, phone, birthday, banned, banned_reason, imported_at, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    logError("admin/clients/export GET", error);
    return apiError("Export failed.", 500);
  }

  const header = ["Name", "Email", "Phone", "Date of Birth", "Banned", "Banned Reason", "Imported At", "Created At", "Updated At"];
  type ClientProfileRow = {
    email: string | null;
    name: string | null;
    phone: string | null;
    birthday: string | null;
    banned: boolean | null;
    banned_reason: string | null;
    imported_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  const rows: string[] = [header.map(csvEscape).join(",")];
  for (const r of (data || []) as ClientProfileRow[]) {
    rows.push([
      csvEscape(r.name),
      csvEscape(r.email),
      csvEscape(r.phone),
      csvEscape(r.birthday),
      csvEscape(r.banned ? "true" : "false"),
      csvEscape(r.banned_reason),
      csvEscape(r.imported_at),
      csvEscape(r.created_at),
      csvEscape(r.updated_at),
    ].join(","));
  }
  const body = rows.join("\n");

  const stamp = new Date().toISOString().split("T")[0];
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
