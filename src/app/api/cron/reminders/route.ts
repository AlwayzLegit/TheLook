import { supabase } from "@/lib/supabase";
import { sendReminderEmail } from "@/lib/email";
import { sendReminderSMS } from "@/lib/sms";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

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
  const apptIds = (upcoming || []).map((a: { id: string }) => a.id);
  const { data: mappings } = apptIds.length > 0
    ? await supabase
        .from("appointment_services")
        .select("appointment_id, service_id, sort_order")
        .in("appointment_id", apptIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceMap = Object.fromEntries((allServices || []).map((s: any) => [s.id, s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stylistMap = Object.fromEntries((allStylists || []).map((s: any) => [s.id, s]));
  const apptServicesMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (mappings || []) as any[]) {
    const arr = apptServicesMap.get(m.appointment_id) || [];
    arr.push(m.service_id);
    apptServicesMap.set(m.appointment_id, arr);
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  let sent = 0;

  for (const appt of upcoming || []) {
    const ids = apptServicesMap.get(appt.id) || (appt.service_id ? [appt.service_id] : []);
    const serviceName = ids.map((id) => serviceMap[id]?.name).filter(Boolean).join(", ") || "Your Service";
    await sendReminderEmail({
      clientName: appt.client_name,
      clientEmail: appt.client_email,
      serviceName,
      stylistName: stylistMap[appt.stylist_id]?.name || "Your Stylist",
      date: appt.date,
      startTime: appt.start_time,
      cancelUrl: appt.cancel_token
        ? `${baseUrl}/book/cancel?token=${appt.cancel_token}`
        : undefined,
    });

    // Also send SMS if phone available. Pass raw HH:MM — sendReminderSMS
    // formats it with its own 12h helper.
    if (appt.client_phone) {
      await sendReminderSMS(
        appt.client_phone,
        appt.client_name,
        appt.start_time,
        appt.id,
        appt.client_email,
      );
    }

    await supabase
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", appt.id);

    sent++;
  }

  return apiSuccess({ sent, date: tomorrowStr });
}
