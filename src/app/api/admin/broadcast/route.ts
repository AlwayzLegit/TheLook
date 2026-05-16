import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, userHasPermission } from "@/lib/roles";
import { denyMissingPermission } from "@/lib/apiAuth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { logAdminAction } from "@/lib/auditLog";
import { sendSMS } from "@/lib/sms";
import { sendRawEmail, brandedFromText } from "@/lib/email";
import { estimateSmsCost } from "@/lib/smsLength";
import { getBranding } from "@/lib/branding";
import { z } from "zod";
import { NextRequest } from "next/server";

// Phone-only walk-ins carry a synthetic placeholder address; mailing
// it is a guaranteed bounce, so they're excluded from email blasts.
const SYNTHETIC_EMAIL_RE = /@noemail\.thelookhairsalonla\.com$/i;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Owner-initiated broadcast. Separate from the per-appointment SMS/email
// paths because broadcasts need segmentation, cost pre-flight, and a
// confirm step before a few hundred sends fire.
//
// Channels
//   sms    — opted-in phone numbers only (A2P compliance requires it).
//            Respects STOP / opt-out list via sendSMS.
//   email  — anyone with a valid email on their client_profile. Skips
//            unsubscribes automatically via Resend's unsubscribe headers.
//
// Audience segments
//   all           — every client_profiles row
//   active_6mo    — clients with an appointment in the last 6 months
//   service       — clients who've ever booked a given service_id
//
// GET returns segment sizes + cost estimate (no send).
// POST with { confirm: true } actually fires the send.

const schema = z.object({
  channel: z.enum(["sms", "email"]),
  segment: z.enum(["all", "active_6mo", "service"]),
  serviceId: z.string().uuid().optional(),
  subject: z.string().trim().max(140).optional(),
  message: z.string().trim().min(1).max(2000),
  confirm: z.boolean().optional(),
  // Safety cap — the API will refuse to send to more than this many
  // recipients in one shot. Forces the owner to split a huge blast
  // instead of ripping through the whole list accidentally.
  limit: z.number().int().min(1).max(2000).optional(),
});

interface AudienceRow {
  email: string;
  name: string | null;
  phone: string | null;
  sms_consent: boolean | null;
}

async function collectAudience(
  segment: "all" | "active_6mo" | "service",
  serviceId: string | undefined,
): Promise<AudienceRow[]> {
  if (segment === "service") {
    if (!serviceId) return [];
    // Clients who've booked this service at least once. Pull appointments
    // directly and dedupe by email — client_profiles doesn't track the
    // service history in an easily-queryable way.
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("client_email, client_name, client_phone, sms_consent")
      .eq("service_id", serviceId)
      .not("client_email", "like", "%@thelookhairsalonla.local"); // skip walk-in sentinels
    if (error) return [];
    const seen = new Map<string, AudienceRow>();
    for (const row of (appts || []) as Array<{
      client_email: string;
      client_name: string | null;
      client_phone: string | null;
      sms_consent: boolean | null;
    }>) {
      if (!row.client_email) continue;
      if (!seen.has(row.client_email)) {
        seen.set(row.client_email, {
          email: row.client_email,
          name: row.client_name,
          phone: row.client_phone,
          sms_consent: row.sms_consent,
        });
      }
    }
    return Array.from(seen.values());
  }

  if (segment === "active_6mo") {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const sinceDate = since.toISOString().slice(0, 10);
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("client_email, client_name, client_phone, sms_consent")
      .gte("date", sinceDate)
      .not("client_email", "like", "%@thelookhairsalonla.local");
    if (error) return [];
    const seen = new Map<string, AudienceRow>();
    for (const row of (appts || []) as Array<{
      client_email: string;
      client_name: string | null;
      client_phone: string | null;
      sms_consent: boolean | null;
    }>) {
      if (!row.client_email) continue;
      if (!seen.has(row.client_email)) {
        seen.set(row.client_email, {
          email: row.client_email,
          name: row.client_name,
          phone: row.client_phone,
          sms_consent: row.sms_consent,
        });
      }
    }
    return Array.from(seen.values());
  }

  // all — pull from client_profiles if available, fall back to the
  // appointments dedupe so a pre-profile install still works.
  try {
    const { data, error } = await supabase
      .from("client_profiles")
      .select("email, name, phone, sms_consent")
      .not("email", "like", "%@thelookhairsalonla.local");
    if (error) throw error;
    return ((data || []) as AudienceRow[]).filter((r) => !!r.email);
  } catch {
    const { data: appts } = await supabase
      .from("appointments")
      .select("client_email, client_name, client_phone, sms_consent")
      .not("client_email", "like", "%@thelookhairsalonla.local");
    const seen = new Map<string, AudienceRow>();
    for (const row of (appts || []) as Array<{
      client_email: string;
      client_name: string | null;
      client_phone: string | null;
      sms_consent: boolean | null;
    }>) {
      if (!row.client_email) continue;
      if (!seen.has(row.client_email)) {
        seen.set(row.client_email, {
          email: row.client_email,
          name: row.client_name,
          phone: row.client_phone,
          sms_consent: row.sms_consent,
        });
      }
    }
    return Array.from(seen.values());
  }
}

function fillPlaceholders(template: string, name: string | null, brandName: string): string {
  return template
    .replace(/\{\{\s*client_name\s*\}\}/gi, name || "there")
    .replace(/\{\{\s*salon_name\s*\}\}/gi, brandName);
}

// Shared preview + audience-count handler. Used by the confirm-step
// pre-flight so the owner sees "This will send 312 SMS (~$4.68, 1
// segment each)" before they click through.
async function buildPreflight(input: z.infer<typeof schema>) {
  const audience = await collectAudience(input.segment, input.serviceId);
  const eligible = audience.filter((r) => {
    if (input.channel === "sms") return Boolean(r.phone && r.sms_consent);
    return Boolean(r.email);
  });
  const cost = estimateSmsCost(input.message);
  return { audienceSize: audience.length, eligibleCount: eligible.length, cost };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
    if (!user) return apiError("Unauthorized", 401);
  if (!userHasPermission(user, "manage_clients")) return denyMissingPermission(user, "manage_clients", request);
  if (!hasSupabaseConfig) return apiSuccess({ audienceSize: 0, eligibleCount: 0, cost: null });

  const sp = request.nextUrl.searchParams;
  const parsed = schema.safeParse({
    channel: sp.get("channel") || undefined,
    segment: sp.get("segment") || undefined,
    serviceId: sp.get("serviceId") || undefined,
    message: sp.get("message") || "preview",
    subject: sp.get("subject") || undefined,
  });
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid filter.", 400);
  const pre = await buildPreflight(parsed.data);
  return apiSuccess(pre);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
    if (!user) return apiError("Unauthorized", 401);
  if (!userHasPermission(user, "manage_clients")) return denyMissingPermission(user, "manage_clients", request);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid payload.", 400);

  if (parsed.data.channel === "email" && !parsed.data.subject) {
    return apiError("Subject is required for email broadcasts.", 400);
  }

  if (!parsed.data.confirm) {
    const pre = await buildPreflight(parsed.data);
    return apiSuccess({ ...pre, confirmed: false });
  }

  const audience = await collectAudience(parsed.data.segment, parsed.data.serviceId);
  const eligible = audience.filter((r) => {
    if (parsed.data.channel === "sms") return Boolean(r.phone && r.sms_consent);
    return Boolean(r.email) && !SYNTHETIC_EMAIL_RE.test(r.email);
  });

  const cap = parsed.data.limit ?? 500;
  if (eligible.length > cap) {
    return apiError(
      `Audience is ${eligible.length}, over the ${cap} cap for a single blast. Narrow the segment or raise the limit explicitly.`,
      400,
    );
  }

  const brand = await getBranding();
  const results = { sent: 0, failed: 0, skipped: 0 };

  // Serial with small concurrency window — Twilio and Resend both throttle
  // bursts, and a single salon's audience is small enough that 500 fires
  // in under a minute at this pace.
  for (const row of eligible) {
    const filled = fillPlaceholders(parsed.data.message, row.name, brand.name);

    if (parsed.data.channel === "sms") {
      const ok = await sendSMS({
        to: row.phone!,
        body: filled,
        event: "broadcast",
      });
      if (ok) results.sent += 1;
      else results.failed += 1;
    } else {
      const subject = parsed.data.subject!;
      const html = brandedFromText({
        kicker: "Message from the salon",
        headline: subject,
        preheader: subject,
        text: filled,
      });
      const ok = await sendRawEmail({
        to: row.email,
        subject,
        text: filled,
        html,
      });
      if (ok) results.sent += 1;
      else results.failed += 1;
      // Space email sends to ~4/s so a large blast stays under
      // Resend's 5 req/s cap (the per-send retry in lib/email
      // absorbs any residual spike). SMS keeps its own pacing.
      await sleep(250);
    }
  }

  await logAdminAction(
    "broadcast.send",
    JSON.stringify({
      channel: parsed.data.channel,
      segment: parsed.data.segment,
      serviceId: parsed.data.serviceId,
      eligibleCount: eligible.length,
      sent: results.sent,
      failed: results.failed,
    }),
  );

  return apiSuccess({
    confirmed: true,
    channel: parsed.data.channel,
    eligibleCount: eligible.length,
    ...results,
  });
}
