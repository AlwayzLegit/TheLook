import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
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
  
  // Generate slug from name
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  
  const { data, error } = await supabase
    .from("stylists")
    .insert({
      name: body.name,
      slug: slug,
      bio: body.bio,
      image_url: body.image_url,
      specialties: body.specialties,
      active: body.active ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating stylist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
