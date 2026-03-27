import { db } from "@/lib/db";
import { scheduleRules } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await db.select().from(scheduleRules);
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { stylistId, ruleType, dayOfWeek, specificDate, startTime, endTime, isClosed, note } = body;

  await db.insert(scheduleRules).values({
    stylistId: stylistId || null,
    ruleType,
    dayOfWeek: dayOfWeek ?? null,
    specificDate: specificDate || null,
    startTime: startTime || null,
    endTime: endTime || null,
    isClosed: !!isClosed,
    note: note || null,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(scheduleRules).where(eq(scheduleRules.id, id));
  return NextResponse.json({ success: true });
}
