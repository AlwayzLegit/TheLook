import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminStylistSchema } from "@/lib/validation";
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
  const parsed = adminStylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stylist payload" }, { status: 400 });
  }
  const payload = parsed.data;
  
  const updateData: Record<string, unknown> = {
    name: payload.name,
    bio: payload.bio,
    image_url: payload.image_url,
    specialties: payload.specialties,
    active: payload.active,
    sort_order: payload.sort_order,
    updated_at: new Date().toISOString(),
  };
  
  // Regenerate slug if name changed
  if (payload.name) {
    updateData.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
