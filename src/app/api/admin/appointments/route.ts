import { db } from "@/lib/db";
import { appointments, services, stylists } from "@/lib/schema";
import { requireAdmin } from "@/lib/api-auth";
import { APPOINTMENT_STATUSES, badRequest } from "@/lib/validation";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const listQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(APPOINTMENT_STATUSES).nullable().optional(),
  stylistId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const parsedQuery = listQuerySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    status: searchParams.get("status"),
    stylistId: searchParams.get("stylistId"),
  });
  if (!parsedQuery.success) {
    return NextResponse.json(badRequest(parsedQuery.error), { status: 400 });
  }
  const { from: dateFrom, to: dateTo, status, stylistId } = parsedQuery.data;

  const conditions = [];
  if (dateFrom) conditions.push(gte(appointments.date, dateFrom));
  if (dateTo) conditions.push(lte(appointments.date, dateTo));
  if (status) conditions.push(eq(appointments.status, status));
  if (stylistId) conditions.push(eq(appointments.stylistId, stylistId));

  const rows = await db
    .select({
      appointment: appointments,
      serviceName: services.name,
      stylistName: stylists.name,
    })
    .from(appointments)
    .leftJoin(services, eq(services.id, appointments.serviceId))
    .leftJoin(stylists, eq(stylists.id, appointments.stylistId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(appointments.date), desc(appointments.startTime));

  const enriched = rows.map((r) => ({
    ...r.appointment,
    serviceName: r.serviceName,
    stylistName: r.stylistName,
  }));

  return NextResponse.json(enriched);
}
