import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
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
  
  const { data, error } = await supabase
    .from("services")
    .insert({
      category: body.category,
      name: body.name,
      price_text: body.price_text,
      price_min: body.price_min,
      duration: body.duration,
      active: body.active ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
