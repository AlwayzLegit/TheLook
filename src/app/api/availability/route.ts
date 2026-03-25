import { getAvailableSlots } from "@/lib/availability";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stylistId = searchParams.get("stylistId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!stylistId || !serviceId || !date) {
    return NextResponse.json(
      { error: "stylistId, serviceId, and date are required" },
      { status: 400 }
    );
  }

  const slots = await getAvailableSlots(stylistId, serviceId, date);
  return NextResponse.json({ slots });
}
