import { getAvailableSlots } from "@/lib/availability";
import { availabilityQuerySchema, badRequest } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = availabilityQuerySchema.safeParse({
    stylistId: searchParams.get("stylistId"),
    serviceId: searchParams.get("serviceId"),
    date: searchParams.get("date"),
  });
  if (!parsed.success) {
    return NextResponse.json(badRequest(parsed.error), { status: 400 });
  }

  const { stylistId, serviceId, date } = parsed.data;
  const slots = await getAvailableSlots(stylistId, serviceId, date);
  return NextResponse.json({ slots });
}
