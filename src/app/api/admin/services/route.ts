import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminServiceSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

// GET all services
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// CREATE new service
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    active: payload.active ?? true,
    sort_order: payload.sort_order ?? 0,
  };

  let data;
  let error;
  ({ data, error } = await supabase
    .from("services")
    .insert({
      ...basePayload,
      image_url: payload.image_url || null,
    })
    .select()
    .single());

  // Backward compatibility for databases that do not yet have services.image_url.
  if (error && (error.message || "").toLowerCase().includes("image_url")) {
    ({ data, error } = await supabase
      .from("services")
      .insert(basePayload)
      .select()
      .single());
  }

  if (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
