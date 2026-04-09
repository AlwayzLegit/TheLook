import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// UPDATE service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  
  const { data, error } = await supabase
    .from("services")
    .update({
      category: body.category,
      name: body.name,
      price_text: body.price_text,
      price_min: body.price_min,
      duration: body.duration,
      active: body.active,
      sort_order: body.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating service:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
