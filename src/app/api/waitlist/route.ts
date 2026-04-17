import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { RATE_LIMITS } from "@/lib/constants";
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

  const body = await request.json();
  if (!body.serviceId || !body.clientName || !body.clientEmail) {
    return apiError("Service, name, and email are required.", 400);
  }

  const { error } = await supabase.from("waitlist").insert({
    service_id: body.serviceId,
    stylist_id: body.stylistId || null,
    client_name: body.clientName,
    client_email: body.clientEmail,
    client_phone: body.clientPhone || null,
    preferred_date: body.preferredDate || null,
    preferred_time_range: body.preferredTimeRange || null,
    notes: body.notes || null,
  });

  if (error) {
    logError("waitlist POST", error);
    return apiError("Failed to join waitlist.", 500);
  }

  return apiSuccess({ success: true, message: "You're on the waitlist! We'll email you when a slot opens up." }, 201);
}
