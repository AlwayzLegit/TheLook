import { db } from "@/lib/db";
import { stylists, stylistServices } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

function parseSpecialties(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const rows = await db
    .select({
      stylist: stylists,
      serviceId: stylistServices.serviceId,
    })
    .from(stylists)
    .leftJoin(stylistServices, eq(stylistServices.stylistId, stylists.id))
    .where(eq(stylists.active, true))
    .orderBy(asc(stylists.sortOrder));

  const byId = new Map<string, ReturnType<typeof formatStylist>>();
  for (const row of rows) {
    const existing = byId.get(row.stylist.id);
    if (!existing) {
      byId.set(row.stylist.id, formatStylist(row.stylist, row.serviceId));
    } else if (row.serviceId) {
      existing.serviceIds.push(row.serviceId);
    }
  }

  return NextResponse.json(Array.from(byId.values()));
}

function formatStylist(s: typeof stylists.$inferSelect, serviceId: string | null) {
  return {
    ...s,
    specialties: parseSpecialties(s.specialties),
    serviceIds: serviceId ? [serviceId] : [],
  };
}
