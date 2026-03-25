import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { sendCancellationEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Cancel token required" }, { status: 400 });
  }

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.cancelToken, token));

  if (!appointment) {
    return NextResponse.json({ error: "Invalid cancel token" }, { status: 404 });
  }

  if (appointment.status === "cancelled") {
    return NextResponse.json({ message: "Already cancelled" });
  }

  await db
    .update(appointments)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(eq(appointments.id, appointment.id));

  // Get service & stylist names for email
  const [service] = await db.select().from(services).where(eq(services.id, appointment.serviceId));
  const [stylist] = await db.select().from(stylists).where(eq(stylists.id, appointment.stylistId));

  sendCancellationEmail({
    clientName: appointment.clientName,
    clientEmail: appointment.clientEmail,
    serviceName: service?.name || "Your Service",
    stylistName: stylist?.name || "Your Stylist",
    date: appointment.date,
    startTime: appointment.startTime,
  }).catch(console.error);

  return NextResponse.json({ message: "Appointment cancelled" });
}
