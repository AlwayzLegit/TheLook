import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, logError } from "@/lib/apiResponse";
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
      const statusMap: Record<string, string> = {
        queued: "queued",
        sending: "queued",
        sent: "sent",
        delivered: "delivered",
        undelivered: "failed",
        failed: "failed",
      };
      const mapped = statusMap[messageStatus.toLowerCase()] || messageStatus.toLowerCase();
      await supabase
        .from("sms_log")
        .update({
          status: mapped,
          failure_reason: errorCode ? `${errorCode}${errorMessage ? `: ${errorMessage}` : ""}` : null,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_sid", messageSid);
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
