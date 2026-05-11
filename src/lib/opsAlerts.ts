import { supabase, hasSupabaseConfig } from "./supabase";
import { createNotification } from "./notifications";

// Operational-failure alerting. The first time something breaks in a
// way that's invisible to the operator (e.g. Resend rejects an email
// soft-fail-style, Twilio rate-limits us, a webhook handler 500s on
// every retry), this helper fires a single admin-bell notification +
// audit-log entry. Further failures of the same category are
// suppressed within DEDUP_WINDOW_MS so the bell doesn't flood when an
// outage starts cascading (e.g. RESEND_API_KEY missing → every email
// fails).
//
// Designed to never throw and never block the caller. Email + SMS
// paths call this from a fire-and-forget try/catch, so silent dedup
// failure is preferable to surfacing a notification-system error to
// the user.

const DEDUP_WINDOW_MS = 60 * 60 * 1000;

export type OpsCategory =
  // Resend send returned an error or got skipped due to missing API key.
  | "email"
  // Twilio SMS send threw or returned a non-success status.
  | "sms"
  // Stripe webhook handler returned 5xx after retries — payment may not
  // have reconciled correctly.
  | "stripe";

function categoryLabel(category: OpsCategory): string {
  if (category === "email") return "Email sending";
  if (category === "sms") return "SMS sending";
  if (category === "stripe") return "Stripe webhook";
  return category;
}

export async function notifyOpsFailure(args: {
  category: OpsCategory;
  reason: string;
  // Short, single-line context for the operator (event name + masked
  // recipient is usually enough). Avoid raw PII — the full payload
  // already lives in admin_log under the event's own log entry.
  context?: string;
}): Promise<void> {
  if (!hasSupabaseConfig) return;

  // VERCEL_ENV is set to "production" / "preview" / "development" on
  // Vercel deployments and undefined locally. Fire on production +
  // preview so preview deploys can verify the wiring; skip pure local
  // dev where the operator already sees errors in their terminal.
  const env = process.env.VERCEL_ENV;
  if (env !== "production" && env !== "preview") return;

  const notificationType = `ops_failure.${args.category}`;
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

  try {
    // Dedup gate — query the notifications table directly so multiple
    // serverless instances converge on the same answer instead of each
    // firing their own copy. Cheap (indexed on type + created_at).
    const { data: recent } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", notificationType)
      .gte("created_at", cutoff)
      .limit(1);
    if (recent && recent.length > 0) return;

    const label = categoryLabel(args.category);
    await createNotification({
      toAllAdmins: true,
      type: notificationType,
      title: `${label} is failing`,
      body: `Reason: ${args.reason}${args.context ? `\n\n${args.context}` : ""}\n\nCheck /admin/errors for the recent send history. Notifications for this category are suppressed for the next hour while the issue is being investigated.`,
      url: "/admin/errors",
    });

    // Also log so the operator can audit when alerts fired vs when
    // failures actually started in admin_log's email.*.failed rows.
    const { logAdminAction } = await import("./auditLog");
    await logAdminAction(
      `${notificationType}.alert_fired`,
      JSON.stringify({ reason: args.reason, context: args.context ?? null }),
    );
  } catch {
    // Never let alert delivery break the caller.
  }
}
