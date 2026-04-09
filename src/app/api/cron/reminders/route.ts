import { supabase } from "@/lib/supabase";
import { sendReminderEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Find confirmed appointments for tomorrow that haven't been reminded
  const { data: upcoming, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", tomorrowStr)
    .eq("status", "confirmed")
    .eq("reminder_sent", false);

  if (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }

  // Fetch services and stylists
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

    // Mark as reminded
    await supabase
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", appt.id);

    sent++;
  }

  return NextResponse.json({ sent, date: tomorrowStr });
}
