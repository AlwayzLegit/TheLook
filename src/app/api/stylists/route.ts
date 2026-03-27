import { db } from "@/lib/db";
import { stylists, stylistServices } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const allStylists = await db
    .select()
    .from(stylists)
    .where(eq(stylists.active, true))
    .orderBy(asc(stylists.sortOrder));

  const allMappings = await db.select().from(stylistServices);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = allStylists.map((s: any) => ({
    ...s,
    specialties: s.specialties ? JSON.parse(s.specialties) : [],
    serviceIds: allMappings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.stylistId === s.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.serviceId),
  }));

  return NextResponse.json(result);
}
