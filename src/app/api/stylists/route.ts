import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  if (!hasSupabaseConfig) {
    return NextResponse.json([]);
  }

  // Fetch stylists
  const { data: allStylists, error: stylistsError } = await supabase
    .from("stylists")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (stylistsError) {
    console.error("Error fetching stylists:", stylistsError);
    return NextResponse.json([], { status: 500 });
  }

  // Fetch stylist-service mappings
  const { data: allMappings, error: mappingsError } = await supabase
    .from("stylist_services")
    .select("*");

  if (mappingsError) {
    console.error("Error fetching stylist services:", mappingsError);
    return NextResponse.json([], { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (allStylists || []).map((s: any) => ({
    ...s,
    specialties: s.specialties ? JSON.parse(s.specialties) : [],
    serviceIds: (allMappings || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.stylist_id === s.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.service_id),
  }));

  return NextResponse.json(result);
}
