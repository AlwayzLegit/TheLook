import { supabase, hasSupabaseConfig } from "./supabase";
import { auth } from "./auth";
import { headers } from "next/headers";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = session?.user as any;
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
