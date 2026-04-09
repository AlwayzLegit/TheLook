import { db } from "@/lib/db";
import { scheduleRules } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { adminScheduleSchema } from "@/lib/validation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rules = await db.select().from(scheduleRules);
    return NextResponse.json(rules);
  } catch {
    if (!hasSupabaseConfig) {
      return NextResponse.json([], { status: 200 });
    }
    const { data, error } = await supabase
      .from("schedule_rules")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      return NextResponse.json({ error: "Failed to load schedule." }, { status: 500 });
    }
    const mapped = (data || []).map((r) => ({
      id: r.id,
      stylistId: r.stylist_id,
      ruleType: r.rule_type,
      dayOfWeek: r.day_of_week,
      specificDate: r.specific_date,
      startTime: r.start_time,
      endTime: r.end_time,
      isClosed: r.is_closed,
      note: r.note,
    }));
    return NextResponse.json(mapped);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = adminScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid schedule payload" }, { status: 400 });
  }
  const { stylistId, ruleType, dayOfWeek, specificDate, startTime, endTime, isClosed, note } = parsed.data;

  try {
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
  } catch {
    if (!hasSupabaseConfig) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const { error } = await supabase.from("schedule_rules").insert({
      stylist_id: stylistId || null,
      rule_type: ruleType,
      day_of_week: dayOfWeek ?? null,
      specific_date: specificDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      is_closed: !!isClosed,
      note: note || null,
    });
    if (error) {
      return NextResponse.json({ error: "Failed to add rule." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await db.delete(scheduleRules).where(eq(scheduleRules.id, id));
  } catch {
    if (!hasSupabaseConfig) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const { error } = await supabase.from("schedule_rules").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Failed to delete rule." }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true });
}
