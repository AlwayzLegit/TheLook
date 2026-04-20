import { supabase } from "@/lib/supabase";
import { sendReviewRequestEmail } from "@/lib/email";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

const YELP_ALIAS_FALLBACK = "the-look-hair-salon-glendale";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  // Target: appointments that were completed yesterday, haven't had a
  // review request sent yet. "Completed" here = status = 'completed' OR
  // (status = 'confirmed' AND date is yesterday or earlier). We'll keep
  // the strict check: status = 'completed'.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // is_test rows must never trigger a real review request — pre-migration
  // installs lack the column so retry without the filter on schema error.
  let { data: eligible, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("status", "completed")
    .eq("date", yesterdayStr)
    .is("review_request_sent_at", null)
    .eq("is_test", false);
  if (error && /is_test/i.test(error.message || "")) {
    ({ data: eligible, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("status", "completed")
      .eq("date", yesterdayStr)
      .is("review_request_sent_at", null));
  }

  if (error) {
    logError("cron/review-requests GET", error);
    return apiError("Failed to fetch appointments.", 500);
  }

  const { data: allServices } = await supabase.from("services").select("id, name");
  const { data: allStylists } = await supabase.from("stylists").select("id, name");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries((allServices || []).map((s: any) => [s.id, s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistMap = Object.fromEntries((allStylists || []).map((s: any) => [s.id, s]));

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  const placeId = process.env.GOOGLE_PLACE_ID;
  const yelpAlias = process.env.YELP_BUSINESS_ALIAS || YELP_ALIAS_FALLBACK;

  const googleUrl = placeId
    ? `https://search.google.com/local/writereview?placeid=${placeId}`
    : `${baseUrl}/review`;
  const yelpUrl = `https://www.yelp.com/writeareview/biz/${yelpAlias}`;
  const reviewUrl = `${baseUrl}/review`;

  let sent = 0;
  for (const appt of eligible || []) {
    await sendReviewRequestEmail({
      clientName: appt.client_name,
      clientEmail: appt.client_email,
      serviceName: serviceMap[appt.service_id]?.name || "your service",
      stylistName: stylistMap[appt.stylist_id]?.name || "our team",
      date: appt.date,
      reviewUrl,
      googleUrl,
      yelpUrl,
    });

    await supabase
      .from("appointments")
      .update({ review_request_sent_at: new Date().toISOString() })
      .eq("id", appt.id);

    sent++;
  }

  return apiSuccess({ sent, date: yesterdayStr });
}
