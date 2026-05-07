import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

type Service = typeof services.$inferSelect;

export async function GET() {
  const allServices = await db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder));

  const grouped: Record<string, Service[]> = {};
  for (const s of allServices) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return NextResponse.json(grouped);
}
