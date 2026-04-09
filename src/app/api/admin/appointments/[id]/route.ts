import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// UPDATE appointment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  
  const updateData: Record<string, unknown> = {};
  
  if (body.status) updateData.status = body.status;
  if (body.staff_notes !== undefined) updateData.staff_notes = body.staff_notes;
  if (body.date) updateData.date = body.date;
  if (body.start_time) updateData.start_time = body.start_time;
  if (body.end_time) updateData.end_time = body.end_time;
  
  updateData.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
