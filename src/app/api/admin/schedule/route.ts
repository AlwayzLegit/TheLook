import { db } from "@/lib/db";
import { scheduleRules } from "@/lib/schema";
import { requireAdmin } from "@/lib/api-auth";
import { badRequest, createScheduleRuleSchema } from "@/lib/validation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const idSchema = z.string().uuid();

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const rules = await db.select().from(scheduleRules);
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createScheduleRuleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(badRequest(parsed.error), { status: 400 });
  }
  const { stylistId, ruleType, dayOfWeek, specificDate, startTime, endTime, isClosed, note } =
    parsed.data;

  await db.insert(scheduleRules).values({
    stylistId: stylistId ?? null,
    ruleType,
    dayOfWeek: dayOfWeek ?? null,
    specificDate: specificDate ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    isClosed: !!isClosed,
    note: note ?? null,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id || !idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  }

  await db.delete(scheduleRules).where(eq(scheduleRules.id, id));
  return NextResponse.json({ success: true });
}
