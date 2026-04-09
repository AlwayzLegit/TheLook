import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminServiceSchema } from "@/lib/validation";
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
  const parsed = adminServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid service payload" }, { status: 400 });
  }
  const payload = parsed.data;
  const basePayload = {
    category: payload.category,
    name: payload.name,
    price_text: payload.price_text,
    price_min: payload.price_min,
    duration: payload.duration,
    active: payload.active,
    sort_order: payload.sort_order,
    updated_at: new Date().toISOString(),
  };

  let data;
  let error;
  ({ data, error } = await supabase
    .from("services")
    .update({
      ...basePayload,
      image_url: payload.image_url || null,
    })
    .eq("id", id)
    .select()
    .single());

  // Backward compatibility for databases that do not yet have services.image_url.
  if (error && (error.message || "").toLowerCase().includes("image_url")) {
    ({ data, error } = await supabase
      .from("services")
      .update(basePayload)
      .eq("id", id)
      .select()
      .single());
  }

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
