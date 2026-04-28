import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, logError } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { NextRequest } from "next/server";

/**
 * Twilio inbound webhook.
 *
 * Twilio sends form-urlencoded bodies and expects a 200 with a TwiML or
 * empty response. We handle two kinds of callbacks on the same route:
 *
 *   1. Incoming SMS from clients — watch for STOP/UNSUBSCRIBE/START keywords
 *      and update sms_optouts accordingly.
 *   2. Status callbacks on outbound messages — update the matching sms_log
 *      row's status + failure_reason.
 *
 * Configure the URL in the Twilio console:
 *   Messaging → Services → Integration → "A message comes in" webhook
 *   → https://www.thelookhairsalonla.com/api/twilio/webhook
 *   Also set the same URL as the status callback for outbound messages.
 */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  let form: URLSearchParams;
  try {
    const raw = await request.text();
    form = new URLSearchParams(raw);
  } catch {
    return apiError("Invalid form body.", 400);
  }

  const messageStatus = form.get("MessageStatus") || form.get("SmsStatus");
  const messageSid = form.get("MessageSid");
  const from = form.get("From");
  const body = (form.get("Body") || "").trim();
  const errorCode = form.get("ErrorCode");
  const errorMessage = form.get("ErrorMessage");

  try {
    // ---- Delivery status callback path ----
    if (messageSid && messageStatus) {
      const rawStatus = messageStatus.toLowerCase();
      const statusMap: Record<string, string> = {
        queued: "queued",
        sending: "queued",
        sent: "sent",
        delivered: "delivered",
        undelivered: "failed",
        failed: "failed",
      };
      const mapped = statusMap[rawStatus] || rawStatus;
      const reason = errorCode ? `${errorCode}${errorMessage ? `: ${errorMessage}` : ""}` : null;
      const now = new Date().toISOString();

      const { data: updated } = await supabase
        .from("sms_log")
        .update({
          status: mapped,
          provider_status: rawStatus,
          last_status_at: now,
          // Stamp delivered_at exactly once — when the carrier
          // confirms the handset received the message. Don't
          // clobber with a later "sending" event from a stuck
          // queue retry on Twilio's side.
          ...(rawStatus === "delivered" ? { delivered_at: now } : {}),
          failure_reason: reason,
          updated_at: now,
        })
        .eq("provider_sid", messageSid)
        .select("id, to_phone, event, appointment_id, client_email, body")
        .maybeSingle();

      // Mirror final-state events into admin_log so /admin/activity
      // shows "delivered" / "undelivered" rows alongside our other
      // audit trail. We only write for terminal states (delivered /
      // failed / undelivered) to avoid spamming the feed with
      // intermediate "sending"/"sent" hops.
      if (updated && (rawStatus === "delivered" || rawStatus === "undelivered" || rawStatus === "failed")) {
        const action =
          rawStatus === "delivered" ? "sms.delivered" :
          rawStatus === "undelivered" ? "sms.undelivered" : "sms.failed";
        const detailsObj: Record<string, unknown> = {
          messageSid,
          to: updated.to_phone,
          event: updated.event,
          providerStatus: rawStatus,
        };
        if (reason) detailsObj.error = reason;
        if (updated.client_email) detailsObj.clientEmail = updated.client_email;
        // Truncate body in the audit feed — full text already lives
        // in sms_log.body if the operator needs to read it.
        if (typeof updated.body === "string") {
          detailsObj.bodyPreview = updated.body.length > 80 ? `${updated.body.slice(0, 77)}…` : updated.body;
        }
        await logAdminAction(
          action,
          JSON.stringify(detailsObj),
          updated.appointment_id || undefined,
        ).catch(() => {});
      }
    }

    // ---- Inbound message path (STOP / START) ----
    if (from && body) {
      const keyword = body.toUpperCase().split(/\s+/)[0];
      const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
      const START_WORDS = new Set(["START", "YES", "UNSTOP"]);

      if (STOP_WORDS.has(keyword)) {
        await supabase
          .from("sms_optouts")
          .upsert({ to_phone: from, reason: keyword }, { onConflict: "to_phone" });
      } else if (START_WORDS.has(keyword)) {
        await supabase.from("sms_optouts").delete().eq("to_phone", from);
      }
    }
  } catch (err) {
    logError("twilio/webhook", err);
  }

  // Twilio just wants a 200 with empty TwiML to suppress auto-reply.
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
