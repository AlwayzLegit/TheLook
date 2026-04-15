import { getAvailableSlots } from "@/lib/availability";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stylistId = searchParams.get("stylistId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!stylistId || !serviceId || !date) {
    return apiError("stylistId, serviceId, and date are required.", 400);
  }

  const slots = await getAvailableSlots(stylistId, serviceId, date);
  return apiSuccess({ slots });
}
