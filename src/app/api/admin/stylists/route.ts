import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { adminStylistSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

// GET all stylists
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("stylists")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching stylists:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// CREATE new stylist
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = adminStylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stylist payload" }, { status: 400 });
  }
  const payload = parsed.data;
  
  // Generate slug from name
  const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  
  const { data, error } = await supabase
    .from("stylists")
    .insert({
      name: payload.name,
      slug: slug,
      bio: payload.bio,
      image_url: payload.image_url,
      specialties: payload.specialties,
      active: payload.active ?? true,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating stylist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
