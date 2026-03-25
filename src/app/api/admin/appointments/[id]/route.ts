import { db } from "@/lib/db";
import { appointments, adminLog } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status, staffNotes } = body;

  const updateData: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (status) updateData.status = status;
  if (staffNotes !== undefined) updateData.staffNotes = staffNotes;

  await db.update(appointments).set(updateData).where(eq(appointments.id, id));

  // Log the action
  await db.insert(adminLog).values({
    action: status || "update",
    appointmentId: id,
    details: JSON.stringify(body),
  });

  return NextResponse.json({ success: true });
}
