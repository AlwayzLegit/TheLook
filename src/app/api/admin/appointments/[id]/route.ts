import { db } from "@/lib/db";
import { appointments, adminLog } from "@/lib/schema";
import { requireAdmin } from "@/lib/api-auth";
import { badRequest, updateAppointmentSchema } from "@/lib/validation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const idSchema = z.string().uuid();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid appointment id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateAppointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(badRequest(parsed.error), { status: 400 });
  }
  const { status, staffNotes } = parsed.data;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) updateData.status = status;
  if (staffNotes !== undefined) updateData.staffNotes = staffNotes;

  await db.update(appointments).set(updateData).where(eq(appointments.id, id));

  await db.insert(adminLog).values({
    action: status || "update",
    appointmentId: id,
    details: JSON.stringify(parsed.data),
  });

  return NextResponse.json({ success: true });
}
