import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { sendReminderEmail } from "@/lib/email";
import { eq, and } from "drizzle-orm";
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
  const upcoming = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.date, tomorrowStr),
        eq(appointments.status, "confirmed"),
        eq(appointments.reminderSent, 0)
      )
    );

  const allServices = await db.select().from(services);
  const allStylists = await db.select().from(stylists);
  const serviceMap = Object.fromEntries(allServices.map((s) => [s.id, s]));
  const stylistMap = Object.fromEntries(allStylists.map((s) => [s.id, s]));

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  let sent = 0;

  for (const appt of upcoming) {
    await sendReminderEmail({
      clientName: appt.clientName,
      clientEmail: appt.clientEmail,
      serviceName: serviceMap[appt.serviceId]?.name || "Your Service",
      stylistName: stylistMap[appt.stylistId]?.name || "Your Stylist",
      date: appt.date,
      startTime: appt.startTime,
      cancelUrl: appt.cancelToken
        ? `${baseUrl}/book/cancel?token=${appt.cancelToken}`
        : undefined,
    });

    await db
      .update(appointments)
      .set({ reminderSent: 1 })
      .where(eq(appointments.id, appt.id));

    sent++;
  }

  return NextResponse.json({ sent, date: tomorrowStr });
}
