import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Bulk import from CSV. Accepts multipart/form-data with a `file` field.
//
// Expected columns (case-insensitive, any order):
//   Name, Email, Phone, Date of Birth, Banned
//
// Upsert by email so re-importing the same file updates rows in place.
// Batches rows (500 at a time) to stay under the 1MB PostgREST body cap.

const BATCH = 500;

interface Row {
  email: string;
  name: string;
  phone: string | null;
  birthday: string | null;
  banned: boolean;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Tiny RFC-4180-ish parser — handles quoted fields, embedded commas,
  // escaped quotes. Handles CRLF, LF, and bare CR.
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  const headers = (rows.shift() || []).map((h) => h.trim());
  return { headers, rows: rows.filter((r) => r.some((c) => c && c.trim().length > 0)) };
}

// Accept MM-DD, MM/DD, YYYY-MM-DD, M/D/YYYY, etc. Returns MM-DD for the
// birthday column (which is what the marketing cron + admin UI expect) or
// null on failure.
function normalizeBirthday(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // MM/DD/YYYY or M/D/YYYY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) return `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  // MM-DD standalone
  m = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

function truthy(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1" || s === "banned";
}

function findCol(headers: string[], ...candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return apiError("No file provided.", 400); }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided.", 400);
  if (file.size > 5 * 1024 * 1024) return apiError("File too large (max 5MB).", 400);

  const text = await file.text();
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) return apiError("Empty or unreadable CSV.", 400);

  const cName = findCol(headers, "name", "full name", "client name");
  const cEmail = findCol(headers, "email", "email address");
  const cPhone = findCol(headers, "phone", "phone number", "mobile");
  const cDob = findCol(headers, "date of birth", "dob", "birthday", "birth date");
  const cBanned = findCol(headers, "banned", "blocked", "blacklist");

  if (cEmail < 0) return apiError("CSV must include an 'Email' column.", 400);

  const importedAt = new Date().toISOString();
  const clean: Row[] = [];
  const skipped: Array<{ line: number; reason: string }> = [];

  rows.forEach((r, idx) => {
    const line = idx + 2; // header is line 1
    const email = (r[cEmail] || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ line, reason: "invalid email" });
      return;
    }
    const name = cName >= 0 ? (r[cName] || "").trim() : "";
    // Name is required by the client_profiles schema; fall back to the
    // email's local part so imports don't bounce on minor data quality.
    const finalName = name || email.split("@")[0];
    const phone = cPhone >= 0 ? (r[cPhone] || "").trim() || null : null;
    const birthday = cDob >= 0 ? normalizeBirthday(r[cDob]) : null;
    const banned = cBanned >= 0 ? truthy(r[cBanned]) : false;
    clean.push({ email, name: finalName, phone, birthday, banned });
  });

  if (clean.length === 0) {
    return apiError("No valid rows in the CSV.", 400);
  }

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < clean.length; i += BATCH) {
    const chunk = clean.slice(i, i + BATCH);
    const payload = chunk.map((r) => ({
      email: r.email,
      name: r.name,
      phone: r.phone,
      birthday: r.birthday,
      banned: r.banned,
      imported_at: importedAt,
    }));
    const { data, error } = await supabase
      .from("client_profiles")
      .upsert(payload, { onConflict: "email", ignoreDuplicates: false })
      .select("id, created_at, imported_at");
    if (error) {
      logError("admin/clients/import (batch)", error);
      errors.push(`rows ${i + 1}-${i + chunk.length}: ${error.message}`);
      continue;
    }
    for (const row of (data || []) as Array<{ created_at: string; imported_at: string | null }>) {
      // Heuristic: a row whose created_at ≈ the import timestamp (we stamp
      // imported_at = created_at on insert) is new. Otherwise updated.
      if (row.imported_at === row.created_at) inserted++;
      else updated++;
    }
  }

  await logAdminAction(
    "clients.import",
    JSON.stringify({
      total: clean.length,
      inserted,
      updated,
      skipped: skipped.length,
      filename: file.name,
    }),
  );

  return apiSuccess({
    total: clean.length,
    inserted,
    updated,
    skipped,
    errors,
  });
}
