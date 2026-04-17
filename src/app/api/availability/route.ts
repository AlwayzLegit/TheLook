import { getAvailableSlots } from "@/lib/availability";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stylistId = searchParams.get("stylistId");
  // Accept either a single serviceId or a comma-separated serviceIds list.
  const serviceIdsParam = searchParams.get("serviceIds");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!stylistId || !date) {
    return apiError("stylistId and date are required.", 400);
  }

  const ids = serviceIdsParam
    ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : serviceId
      ? [serviceId]
      : [];

  if (ids.length === 0) {
    return apiError("At least one serviceId is required.", 400);
  }

  const slots = await getAvailableSlots(stylistId, ids, date);
  return apiSuccess({ slots });
}
