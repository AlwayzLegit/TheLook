import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { sendCancellationEmail } from "@/lib/email";
import { cancelTokenSchema } from "@/lib/validation";
import { cancelLimiter, clientKey } from "@/lib/ratelimit";
import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const rl = await cancelLimiter.limit(clientKey(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many cancellation attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } },
    );
  }

  const { searchParams } = request.nextUrl;
  const tokenParam = searchParams.get("token");

  const parsed = cancelTokenSchema.safeParse(tokenParam);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cancel token" }, { status: 400 });
  }
  const token = parsed.data;

  // Conditional update: only flips a row that exists *and* isn't already
  // cancelled. RETURNING tells us whether we won the race.
  const [cancelled] = await db
    .update(appointments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(appointments.cancelToken, token),
        ne(appointments.status, "cancelled"),
      ),
    )
    .returning();

  if (!cancelled) {
    // Either token is bogus or the appointment is already cancelled.
    // Disambiguate without leaking info beyond what the token-holder knows.
    const [existing] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.cancelToken, token));
    if (!existing) {
      return NextResponse.json({ error: "Invalid cancel token" }, { status: 404 });
    }
    return NextResponse.json({ message: "Already cancelled" });
  }

  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, cancelled.serviceId));
  const [stylist] = await db
    .select()
    .from(stylists)
    .where(eq(stylists.id, cancelled.stylistId));

  sendCancellationEmail({
    clientName: cancelled.clientName,
    clientEmail: cancelled.clientEmail,
    serviceName: service?.name || "Your Service",
    stylistName: stylist?.name || "Your Stylist",
    date: cancelled.date,
    startTime: cancelled.startTime,
  }).catch((e) => console.error("cancellation email failed", e));

  return NextResponse.json({ message: "Appointment cancelled" });
}
