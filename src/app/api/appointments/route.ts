import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { getAvailableSlots } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/email";
import { badRequest, createAppointmentSchema } from "@/lib/validation";
import { bookingLimiter, clientKey } from "@/lib/ratelimit";
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

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === "23505" || e.cause?.code === "23505";
}

const SLOT_TAKEN = NextResponse.json(
  { error: "This time slot is no longer available. Please choose another." },
  { status: 409 },
);

export async function POST(request: NextRequest) {
  const rl = await bookingLimiter.limit(clientKey(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAppointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(badRequest(parsed.error), { status: 400 });
  }
  const { serviceId, stylistId, date, startTime, clientName, clientEmail, clientPhone, notes } =
    parsed.data;

  // Pre-flight: slot must be inside the stylist's published schedule and not
  // already booked. The unique index on (stylistId, date, startTime) WHERE
  // status<>'cancelled' is the actual race-safety net.
  const available = await getAvailableSlots(stylistId, serviceId, date);
  if (!available.includes(startTime)) {
    return SLOT_TAKEN;
  }

  const [service] = await db.select().from(services).where(eq(services.id, serviceId));
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const endTime = minutesToTime(timeToMinutes(startTime) + service.duration);
  const cancelToken = crypto.randomUUID().replace(/-/g, "");

  let inserted;
  try {
    [inserted] = await db
      .insert(appointments)
      .values({
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
      })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return SLOT_TAKEN;
    }
    throw err;
  }

  const [stylist] = await db.select().from(stylists).where(eq(stylists.id, stylistId));

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  sendBookingConfirmation({
    clientName,
    clientEmail,
    serviceName: service.name,
    stylistName: stylist?.name || "Your Stylist",
    date,
    startTime,
    cancelUrl: `${baseUrl}/book/cancel?token=${cancelToken}`,
  });

  return NextResponse.json({
    id: inserted.id,
    service: service.name,
    stylist: stylist?.name,
    date,
    startTime,
    endTime,
    status: "confirmed",
  });
}
