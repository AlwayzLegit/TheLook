import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { RATE_LIMITS } from "@/lib/constants";
import { waitlistCreateSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit({
    key: `waitlist:${ip}`,
    limit: RATE_LIMITS.BOOKING.limit,
    windowMs: RATE_LIMITS.BOOKING.windowMs,
  });
  if (!rl.ok) return apiError("Too many requests. Please wait.", 429);

  if (!hasSupabaseConfig) return apiError("Waitlist unavailable right now.", 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }
  const parsed = waitlistCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid form data.", 400);
  }
  const p = parsed.data;

  const { error } = await supabase.from("waitlist").insert({
    service_id: p.serviceId,
    stylist_id: p.stylistId ?? null,
    client_name: p.clientName,
    client_email: p.clientEmail,
    client_phone: p.clientPhone ?? null,
    preferred_date: p.preferredDate ?? null,
    preferred_time_range: p.preferredTimeRange ?? null,
    notes: p.notes ?? null,
  });

  if (error) {
    logError("waitlist POST", error);
    return apiError("Failed to join waitlist.", 500);
  }

  return apiSuccess({ success: true, message: "You're on the waitlist! We'll email you when a slot opens up." }, 201);
}
