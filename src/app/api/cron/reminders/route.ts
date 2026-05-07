import crypto from "node:crypto";
import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { sendReminderEmail } from "@/lib/email";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const upcoming = await db
    .select({
      appointment: appointments,
      serviceName: services.name,
      stylistName: stylists.name,
    })
    .from(appointments)
    .leftJoin(services, eq(services.id, appointments.serviceId))
    .leftJoin(stylists, eq(stylists.id, appointments.stylistId))
    .where(
      and(
        eq(appointments.date, tomorrowStr),
        eq(appointments.status, "confirmed"),
        eq(appointments.reminderSent, false),
      ),
    );

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  let sent = 0;
  const failures: string[] = [];

  for (const row of upcoming) {
    const appt = row.appointment;
    try {
      await sendReminderEmail({
        clientName: appt.clientName,
        clientEmail: appt.clientEmail,
        serviceName: row.serviceName ?? "Your Service",
        stylistName: row.stylistName ?? "Your Stylist",
        date: appt.date,
        startTime: appt.startTime,
        cancelUrl: appt.cancelToken
          ? `${baseUrl}/book/cancel?token=${appt.cancelToken}`
          : undefined,
      });

      await db
        .update(appointments)
        .set({ reminderSent: true })
        .where(eq(appointments.id, appt.id));

      sent++;
    } catch (err) {
      failures.push(appt.id);
      console.error(`reminder failed for ${appt.id}:`, err);
    }
  }

  return NextResponse.json({ sent, failed: failures.length, date: tomorrowStr });
}
