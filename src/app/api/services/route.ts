import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: allServices, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({}, { status: 500 });
  }

  // Group by category
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped: Record<string, any[]> = {};
  for (const s of allServices || []) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return NextResponse.json(grouped);
}
