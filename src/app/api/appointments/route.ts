import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { getAvailableSlots } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/email";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { serviceId, stylistId, date, startTime, clientName, clientEmail, clientPhone, notes } = body;

  if (!serviceId || !stylistId || !date || !startTime || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the slot is still available (prevent double-booking)
  const available = await getAvailableSlots(stylistId, serviceId, date);
  if (!available.includes(startTime)) {
    return NextResponse.json(
      { error: "This time slot is no longer available. Please choose another." },
      { status: 409 }
    );
  }

  // Get service duration to calculate end time
  const [service] = await db.select().from(services).where(eq(services.id, serviceId));
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const endTime = minutesToTime(timeToMinutes(startTime) + service.duration);
  const cancelToken = crypto.randomUUID().replace(/-/g, "");

  // Create appointment
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await db.insert(appointments).values({
    id,
    serviceId,
    stylistId,
    date,
    startTime,
    endTime,
    clientName,
    clientEmail,
    clientPhone: clientPhone || null,
    notes: notes || null,
    cancelToken,
    status: "confirmed",
  });

  // Get stylist name for email
  const [stylist] = await db.select().from(stylists).where(eq(stylists.id, stylistId));

  // Send confirmation email (non-blocking)
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  sendBookingConfirmation({
    clientName,
    clientEmail,
    serviceName: service.name,
    stylistName: stylist?.name || "Your Stylist",
    date,
    startTime,
    cancelUrl: `${baseUrl}/book/cancel?token=${cancelToken}`,
  }).catch(console.error);

  return NextResponse.json({
    id,
    service: service.name,
    stylist: stylist?.name,
    date,
    startTime,
    endTime,
    status: "confirmed",
  });
}
