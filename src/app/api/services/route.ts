import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const allServices = await db
    .select()
    .from(services)
    .where(eq(services.active, 1))
    .orderBy(asc(services.sortOrder));

  // Group by category
  const grouped = allServices.reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<string, typeof allServices>
  );

  return NextResponse.json(grouped);
}
