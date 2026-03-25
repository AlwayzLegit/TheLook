import { db } from "@/lib/db";
import { stylists, stylistServices } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const allStylists = await db
    .select()
    .from(stylists)
    .where(eq(stylists.active, 1))
    .orderBy(asc(stylists.sortOrder));

  const allMappings = await db.select().from(stylistServices);

  const result = allStylists.map((s) => ({
    ...s,
    specialties: s.specialties ? JSON.parse(s.specialties) : [],
    serviceIds: allMappings
      .filter((m) => m.stylistId === s.id)
      .map((m) => m.serviceId),
  }));

  return NextResponse.json(result);
}
