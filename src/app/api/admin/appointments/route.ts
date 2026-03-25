import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const status = searchParams.get("status");
  const stylistId = searchParams.get("stylistId");

  const conditions = [];
  if (dateFrom) conditions.push(gte(appointments.date, dateFrom));
  if (dateTo) conditions.push(lte(appointments.date, dateTo));
  if (status) conditions.push(eq(appointments.status, status));
  if (stylistId) conditions.push(eq(appointments.stylistId, stylistId));

  const rows = await db
    .select()
    .from(appointments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(appointments.date), desc(appointments.startTime));

  // Enrich with service and stylist names
  const allServices = await db.select().from(services);
  const allStylists = await db.select().from(stylists);

  const serviceMap = Object.fromEntries(allServices.map((s) => [s.id, s]));
  const stylistMap = Object.fromEntries(allStylists.map((s) => [s.id, s]));

  const enriched = rows.map((a) => ({
    ...a,
    serviceName: serviceMap[a.serviceId]?.name,
    stylistName: stylistMap[a.stylistId]?.name,
  }));

  return NextResponse.json(enriched);
}
