import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// UPDATE stylist
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  
  const updateData: Record<string, unknown> = {
    name: body.name,
    bio: body.bio,
    image_url: body.image_url,
    specialties: body.specialties,
    active: body.active,
    sort_order: body.sort_order,
    updated_at: new Date().toISOString(),
  };
  
  // Regenerate slug if name changed
  if (body.name) {
    updateData.slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  
  const { data, error } = await supabase
    .from("stylists")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating stylist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE stylist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  const { error } = await supabase
    .from("stylists")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting stylist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
