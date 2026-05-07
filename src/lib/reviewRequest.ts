import { supabase } from "./supabase";
import { sendSMS } from "./sms";
import { sendRawEmail, brandedFromText } from "./email";
import { getSetting } from "./settings";
import { renderTemplate, DEFAULT_TEMPLATES } from "./templates";
import { logError } from "./apiResponse";

// Review-request send pipeline. Used in two places:
//   1. Manual fire from /admin/appointments → "Send review request"
//      action. Admin can edit the body before sending.
//   2. Auto-fire when an appointment status flips to "completed" and
//      review_request_sent_at is still null. Wired from the PATCH
//      /api/admin/appointments/[id] route.
//
// Returns whichever channels actually delivered. Both calls are
// dedup-safe via the review_request_sent_at column — callers can
// check it before calling, or just let this function bail when set.

export interface ReviewRequestOverrides {
  sms?: string;
  emailSubject?: string;
  emailBody?: string;
  channels?: { sms?: boolean; email?: boolean };
  // True when called from the auto-on-completion path so audit logs +
  // skip-if-already-sent behaviour can differ from the manual flow.
  // Manual sends are allowed to re-send (admin chose to); auto sends
  // bail when review_request_sent_at is non-null.
  trigger?: "manual" | "auto";
}

export interface ReviewRequestResult {
  ok: boolean;
  reason?: string;
  smsOk: boolean;
  emailOk: boolean;
  reviewUrl: string;
  alreadySent?: boolean;
  // Filled when a manual send is rejected by the cooldown so the
  // caller can surface "sent X minutes ago" in the UI/toast.
  lastSentAt?: string;
}

// Round-9 review-email dedupe: even with the modal warning, manual
// sends were stacking on top of the auto-send within seconds. Real
// customers got 2-3 review emails for one appointment. We enforce
// the cooldown here at the service layer so any caller (manual API,
// auto trigger, cron, future Slack action) inherits the gate.
const MANUAL_RESEND_COOLDOWN_MS = 30 * 60 * 1000;

export async function sendReviewRequest(
  appointmentId: string,
  overrides: ReviewRequestOverrides = {},
): Promise<ReviewRequestResult> {
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select(
      "id, client_name, client_email, client_phone, sms_consent, service_id, stylist_id, status, review_request_sent_at",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptErr || !appt) {
    return { ok: false, reason: "appointment_not_found", smsOk: false, emailOk: false, reviewUrl: "" };
  }
  if (appt.status !== "completed") {
    return { ok: false, reason: "not_completed", smsOk: false, emailOk: false, reviewUrl: "" };
  }
  // Auto-trigger: skip if already sent — full idempotency.
  // Manual trigger: enforce a 30-minute cooldown so a stuck admin
  // hitting "Resend" (or the auto + manual race seen in round-9 QA)
  // can't blast the customer with multiple emails in a row. After
  // the cooldown elapses, manual is allowed in case of a legitimate
  // bounce / delivery failure.
  if (appt.review_request_sent_at) {
    const lastSent = new Date(appt.review_request_sent_at).getTime();
    const ageMs = Date.now() - lastSent;
    if (overrides.trigger !== "manual") {
      return {
        ok: false,
        reason: "already_sent",
        alreadySent: true,
        smsOk: false,
        emailOk: false,
        reviewUrl: "",
        lastSentAt: appt.review_request_sent_at,
      };
    }
    if (ageMs < MANUAL_RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "cooldown_active",
        alreadySent: true,
        smsOk: false,
        emailOk: false,
        reviewUrl: "",
        lastSentAt: appt.review_request_sent_at,
      };
    }
  }

  const [{ data: stylist }, { data: mappings }] = await Promise.all([
    supabase.from("stylists").select("name").eq("id", appt.stylist_id).maybeSingle(),
    supabase
      .from("appointment_services")
      .select("service_id, sort_order")
      .eq("appointment_id", appointmentId)
      .order("sort_order", { ascending: true }),
  ]);
  const svcIds = (mappings || []).map((m: { service_id: string }) => m.service_id);
  const fallbackIds = svcIds.length ? svcIds : appt.service_id ? [appt.service_id] : [];
  const { data: services } = fallbackIds.length
    ? await supabase.from("services").select("id, name").in("id", fallbackIds)
    : { data: [] };
  type NamedSvc = { id: string; name: string };
  const serviceMap = new Map<string, string>(
    ((services || []) as NamedSvc[]).map((s) => [s.id, s.name]),
  );
  const serviceName =
    fallbackIds.map((sid: string) => serviceMap.get(sid)).filter(Boolean).join(", ") || "your appointment";

  const [smsTpl, emailSubjTpl, emailBodyTpl, reviewUrl] = await Promise.all([
    getSetting("review_request_sms_template").then((v) => v || DEFAULT_TEMPLATES.review_request_sms_template),
    getSetting("review_request_email_subject_template").then(
      (v) => v || DEFAULT_TEMPLATES.review_request_email_subject_template,
    ),
    getSetting("review_request_email_body_template").then(
      (v) => v || DEFAULT_TEMPLATES.review_request_email_body_template,
    ),
    getSetting("google_review_url").then(
      (v) => v || "https://www.google.com/search?q=the+look+hair+salon+glendale+reviews",
    ),
  ]);

  const vars = {
    client_name: appt.client_name || "there",
    service: serviceName,
    stylist: stylist?.name || "your stylist",
    salon_name: "The Look Hair Salon",
    review_url: reviewUrl,
  };

  const wantSms = overrides.channels?.sms ?? true;
  const wantEmail = overrides.channels?.email ?? true;
  // Always run renderTemplate, even on overrides — admin's edit
  // surface in the manual modal explicitly tells them placeholders
  // are filled at send time, so {{client_name}} etc. in the override
  // body must still substitute. Old behaviour passed the override
  // through verbatim, which leaked raw {{...}} into the customer's
  // inbox when admin didn't manually substitute first.
  const smsBody = renderTemplate(overrides.sms || smsTpl, vars);
  const emailSubject = renderTemplate(overrides.emailSubject || emailSubjTpl, vars);
  const emailBodyRendered = renderTemplate(overrides.emailBody || emailBodyTpl, vars);

  // Pre-stamp `review_request_sent_at` BEFORE firing the SMS / email
  // sends. Round-10 QA caught a race: when the auto-trigger fired
  // from a "mark complete" PATCH, SMS + email could take 5-90s on
  // a cold start, and the timestamp wasn't written until afterwards.
  // A manual click during that window saw a null sent_at, the
  // cooldown returned empty, and the customer received two of each.
  // Stamping up-front means the very next call inside the cooldown
  // window — manual or auto — bails immediately. Channel results
  // (smsOk / emailOk) are still reported so the audit row doesn't
  // pretend a failure was a success.
  await supabase
    .from("appointments")
    .update({ review_request_sent_at: new Date().toISOString() })
    .eq("id", appointmentId);

  let smsOk = false;
  let emailOk = false;

  if (wantSms && appt.client_phone && appt.sms_consent === true) {
    smsOk = await sendSMS({
      to: appt.client_phone,
      event: "review.request",
      appointmentId,
      clientEmail: appt.client_email || null,
      body: smsBody,
    }).catch((e) => {
      logError("sendReviewRequest sms", e);
      return false;
    });
  }

  if (wantEmail && appt.client_email) {
    emailOk = await sendRawEmail({
      to: appt.client_email,
      subject: emailSubject,
      text: emailBodyRendered,
      html: brandedFromText({
        kicker: "Thanks for visiting",
        headline: `We'd love your feedback, ${vars.client_name.split(" ")[0] || "friend"}!`,
        preheader: `Leave a review for ${vars.service} with ${vars.stylist}`,
        text: emailBodyRendered,
        ctaLabel: "Leave a review",
        ctaUrl: reviewUrl,
      }),
    }).catch((e) => {
      logError("sendReviewRequest email", e);
      return false;
    });
  }

  return { ok: true, smsOk, emailOk, reviewUrl };
}
