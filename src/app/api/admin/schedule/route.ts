import { db } from "@/lib/db";
import { scheduleRules } from "@/lib/schema";
import { requireAdmin } from "@/lib/api-auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const rules = await db.select().from(scheduleRules);
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

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
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(scheduleRules).where(eq(scheduleRules.id, id));
  return NextResponse.json({ success: true });
}
