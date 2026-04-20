import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

// Bulk import from CSV or Excel (.xls / .xlsx). Accepts multipart/form-data
// with a `file` field.
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

  // Detect Excel by extension OR content-type; fall back to CSV for
  // everything else (text/csv, text/plain, etc.).
  const name = (file.name || "").toLowerCase();
  const looksExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel");

  let headers: string[];
  let rows: string[][];
  if (looksExcel) {
    try {
      const buf = await file.arrayBuffer();
      const { default: XLSX } = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) return apiError("The spreadsheet has no sheets.", 400);
      // Raw-string rows so the downstream parser treats dates / phones /
      // banned flags identically to the CSV path.
      const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      });
      const asStrings = matrix.map((r) => (r as unknown[]).map((c) => (c == null ? "" : String(c))));
      headers = (asStrings.shift() || []).map((h) => h.trim());
      rows = asStrings.filter((r) => r.some((c) => c && c.trim().length > 0));
    } catch (err) {
      logError("admin/clients/import (xlsx parse)", err);
      return apiError("Couldn't read that Excel file. Try saving it as CSV and re-uploading.", 400);
    }
  } else {
    const text = await file.text();
    ({ headers, rows } = parseCsv(text));
  }

  if (headers.length === 0) return apiError("Empty or unreadable file.", 400);

  const cName = findCol(headers, "name", "full name", "client name");
  const cEmail = findCol(headers, "email", "email address");
  const cPhone = findCol(headers, "phone", "phone number", "mobile");
  const cDob = findCol(headers, "date of birth", "dob", "birthday", "birth date");
  const cBanned = findCol(headers, "banned", "blocked", "blacklist");

  // Either email or phone is enough to create a profile. Salon-provided
  // sheets typically carry a lot of phone-only rows; we generate a stable
  // synthetic email from the phone so the UNIQUE-email primary key is
  // still satisfied. When the client later gives a real email, the admin
  // UI can edit the profile to update it.
  if (cEmail < 0 && cPhone < 0) {
    return apiError("CSV must include an 'Email' or 'Phone' column.", 400);
  }

  const importedAt = new Date().toISOString();
  const clean: Row[] = [];
  const skipped: Array<{ line: number; reason: string }> = [];

  const digitsOnly = (s: string) => (s || "").replace(/\D/g, "");

  rows.forEach((r, idx) => {
    const line = idx + 2; // header is line 1
    const rawEmail = (cEmail >= 0 ? r[cEmail] : "") || "";
    const emailCandidate = rawEmail.trim().toLowerCase();
    const rawPhone = cPhone >= 0 ? (r[cPhone] || "").trim() : "";

    const emailValid = emailCandidate.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate);

    let email: string;
    if (emailValid) {
      email = emailCandidate;
    } else if (rawPhone && digitsOnly(rawPhone).length >= 7) {
      // Phone-only client — synthesize a deterministic key. Use the digits
      // only so different formatting of the same number collapses to one
      // profile. The @noemail.thelookhairsalonla.com suffix is opaque but
      // passes RFC 5322 and the admin UI treats it like any other row.
      email = `phone-${digitsOnly(rawPhone)}@noemail.thelookhairsalonla.com`;
    } else {
      skipped.push({ line, reason: "no email or phone" });
      return;
    }

    const name = cName >= 0 ? (r[cName] || "").trim() : "";
    // Name is required by the client_profiles schema; fall back to a safe
    // default so minor data quality doesn't bounce the whole row.
    const finalName = name || (emailValid ? email.split("@")[0] : rawPhone || "Client");
    const phone = rawPhone || null;
    const birthday = cDob >= 0 ? normalizeBirthday(r[cDob]) : null;
    const banned = cBanned >= 0 ? truthy(r[cBanned]) : false;
    clean.push({ email, name: finalName, phone, birthday, banned });
  });

  if (clean.length === 0) {
    return apiError("No valid rows in the CSV (every row lacked both email and phone).", 400);
  }

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  // Track whether the schema is missing banned/imported_at so we can warn
  // the admin once instead of spamming per-batch errors.
  let missingBanned = false;
  let missingImportedAt = false;

  const upsertBatch = async (payload: Record<string, unknown>[]) => {
    return await supabase
      .from("client_profiles")
      .upsert(payload, { onConflict: "email", ignoreDuplicates: false })
      .select("id, created_at, imported_at");
  };

  for (let i = 0; i < clean.length; i += BATCH) {
    const chunk = clean.slice(i, i + BATCH);
    // Build payload in full form; strip missing columns on schema errors.
    const base = chunk.map((r) => {
      const row: Record<string, unknown> = {
        email: r.email,
        name: r.name,
        phone: r.phone,
        birthday: r.birthday,
      };
      if (!missingBanned) row.banned = r.banned;
      if (!missingImportedAt) row.imported_at = importedAt;
      return row;
    });

    let { data, error } = await upsertBatch(base);

    // Auto-retry on the two columns added by the 20260421c migration that
    // might not yet exist on this env. Strip the offending column + retry
    // the same chunk. Latches so we don't keep trying on every batch.
    if (error && /'banned'.*column|column.*banned/i.test(error.message || "")) {
      missingBanned = true;
      const retry = base.map(({ banned: _drop, ...rest }) => rest);
      ({ data, error } = await upsertBatch(retry));
    }
    if (error && /'imported_at'.*column|column.*imported_at/i.test(error.message || "")) {
      missingImportedAt = true;
      const retry = base.map(({ imported_at: _drop, ...rest }) => rest);
      ({ data, error } = await upsertBatch(retry));
    }

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

  if (missingBanned) {
    errors.unshift(
      "WARNING: client_profiles.banned column is missing — the import ignored the Banned column. Run migration 20260421c_client_profiles_banned.sql in Supabase SQL Editor, then re-import to record banned flags.",
    );
  }
  if (missingImportedAt) {
    errors.unshift(
      "WARNING: client_profiles.imported_at column is missing. Run migration 20260421c_client_profiles_banned.sql.",
    );
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
