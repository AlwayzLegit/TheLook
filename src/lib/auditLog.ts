import { supabase, hasSupabaseConfig } from "./supabase";
import { auth } from "./auth";
import { headers } from "next/headers";

// Low-level audit writer for auth events. Doesn't depend on an active
// NextAuth session — used from inside the authorize() callback + other
// pre-session paths like the logout hook. Fire-and-forget: failures are
// logged to stderr but never bubble up to the caller.
export async function logAuthEvent(
  action:
    | "auth.login.success"
    | "auth.login.failed"
    | "auth.login.locked"
    | "auth.logout"
    | "auth.signout_idle"
    | "auth.password.rehash"
    | "auth.rbac.denied",
  email: string | null,
  extras?: {
    ip?: string | null;
    userAgent?: string | null;
    userId?: string | null;
    reason?: string | null;
    fromCost?: number;
    toCost?: number;
    // RBAC-denied rows record what was attempted so the audit feed
    // shows which surface a manager bounced off of.
    path?: string | null;
    method?: string | null;
    role?: string | null;
    // The user's hydrated permission set at the time of the denial —
    // gives the audit feed enough to tell "user was missing manage_users
    // specifically" vs "user had no admin permissions at all".
    permissions?: ReadonlyArray<string> | null;
  },
) {
  if (!hasSupabaseConfig) return;
  let ip = extras?.ip ?? null;
  let ua = extras?.userAgent ?? null;
  if (!ip || !ua) {
    try {
      const h = await headers();
      ip ??= h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      ua ??= h.get("user-agent") || null;
    } catch {
      // Called outside a request scope — headers() throws.
    }
  }
  // Compose details from any of the structured extras the caller
  // supplied. We also mirror userAgent into details so SQL queries
  // like `details->>'userAgent'` work without joining to the
  // user_agent column — the round-9 audit query relied on that.
  const detailParts: Record<string, unknown> = {};
  if (extras?.reason) detailParts.reason = extras.reason;
  if (typeof extras?.fromCost === "number") detailParts.fromCost = extras.fromCost;
  if (typeof extras?.toCost === "number") detailParts.toCost = extras.toCost;
  if (extras?.path) detailParts.path = extras.path;
  if (extras?.method) detailParts.method = extras.method;
  if (extras?.role) detailParts.role = extras.role;
  if (Array.isArray(extras?.permissions)) detailParts.permissions = extras!.permissions;
  if (ua) detailParts.userAgent = ua;
  const detailsStr = Object.keys(detailParts).length > 0 ? JSON.stringify(detailParts) : null;

  const row: Record<string, unknown> = {
    action,
    details: detailsStr,
    actor_email: email ? email.toLowerCase() : null,
    actor_user_id: extras?.userId || null,
    ip_address: ip,
    user_agent: ua,
  };
  try {
    let { error } = await supabase.from("admin_log").insert(row);
    if (error && /(actor_email|actor_user_id|ip_address|user_agent)/i.test(error.message || "")) {
      delete row.actor_email;
      delete row.actor_user_id;
      delete row.ip_address;
      delete row.user_agent;
      ({ error } = await supabase.from("admin_log").insert(row));
    }
    if (error) console.error("logAuthEvent failed:", error);
  } catch (err) {
    console.error("logAuthEvent threw:", err);
  }
}

interface AuditExtras {
  actorEmail?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Pull actor + request metadata from the current request when the caller
// didn't pass it explicitly. Best-effort: when this runs outside an API
// context (e.g. a cron), the lookups silently no-op.
async function resolveExtras(extras?: AuditExtras): Promise<AuditExtras> {
  const out: AuditExtras = { ...extras };
  if (!out.actorEmail || !out.actorUserId) {
    try {
      const session = await auth();
      const u = session?.user;
      if (u) {
        out.actorEmail ??= u.email ?? null;
        out.actorUserId ??= u.id ?? null;
      }
    } catch {
      // out of request scope; ignore.
    }
  }
  if (!out.ipAddress || !out.userAgent) {
    try {
      const h = await headers();
      out.ipAddress ??= h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      out.userAgent ??= h.get("user-agent") || null;
    } catch {
      // headers() throws outside a request scope; that's fine.
    }
  }
  return out;
}

/**
 * Log an admin action to the admin_log table.
 * Fire-and-forget: failures are logged but never block the caller.
 *
 * Actor metadata (email, user id, IP, UA) is auto-pulled from the current
 * request when available; pass `extras` to override.
 */
export async function logAdminAction(
  action: string,
  details?: string,
  appointmentId?: string,
  extras?: AuditExtras,
) {
  if (!hasSupabaseConfig) return;

  try {
    const meta = await resolveExtras(extras);
    const row: Record<string, unknown> = {
      action,
      appointment_id: appointmentId || null,
      details: details || null,
      actor_email: meta.actorEmail || null,
      actor_user_id: meta.actorUserId || null,
      ip_address: meta.ipAddress || null,
      user_agent: meta.userAgent || null,
    };
    let { error } = await supabase.from("admin_log").insert(row);
    // Pre-migration installs lack the actor columns — retry without them
    // so the log keeps working until the schema catches up.
    if (error && /(actor_email|actor_user_id|ip_address|user_agent)/i.test(error.message || "")) {
      delete row.actor_email;
      delete row.actor_user_id;
      delete row.ip_address;
      delete row.user_agent;
      ({ error } = await supabase.from("admin_log").insert(row));
    }
    if (error) console.error("Failed to write audit log:", error);
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
