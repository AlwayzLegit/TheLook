import { supabase } from "@/lib/supabase";
import { sendReminderEmail } from "@/lib/email";
import { sendReminderSms, hasTwilioConfig } from "@/lib/sms";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: upcoming, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", tomorrowStr)
    .eq("status", "confirmed")
    .eq("reminder_sent", false);

  if (error) {
    logError("cron/reminders GET", error);
    return apiError("Failed to fetch appointments.", 500);
  }

  const { data: allServices } = await supabase.from("services").select("*");
  const { data: allStylists } = await supabase.from("stylists").select("*");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries((allServices || []).map((s: any) => [s.id, s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistMap = Object.fromEntries((allStylists || []).map((s: any) => [s.id, s]));

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  let sent = 0;

  for (const appt of upcoming || []) {
    await sendReminderEmail({
      clientName: appt.client_name,
      clientEmail: appt.client_email,
      serviceName: serviceMap[appt.service_id]?.name || "Your Service",
      stylistName: stylistMap[appt.stylist_id]?.name || "Your Stylist",
      date: appt.date,
      startTime: appt.start_time,
      cancelUrl: appt.cancel_token
        ? `${baseUrl}/book/cancel?token=${appt.cancel_token}`
        : undefined,
    });

    // Send SMS reminder if phone is on file and Twilio is configured
    if (appt.client_phone && hasTwilioConfig) {
      await sendReminderSms({
        clientName: appt.client_name,
        clientPhone: appt.client_phone,
        serviceName: serviceMap[appt.service_id]?.name || "Your Service",
        stylistName: stylistMap[appt.stylist_id]?.name || "Your Stylist",
        date: appt.date,
        startTime: appt.start_time,
        cancelUrl: appt.cancel_token
          ? `${baseUrl}/book/cancel?token=${appt.cancel_token}`
          : undefined,
      });
    }

    await supabase
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", appt.id);

    sent++;
  }

  return apiSuccess({ sent, date: tomorrowStr });
}
