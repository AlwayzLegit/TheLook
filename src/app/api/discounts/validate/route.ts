import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { discountValidateSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig) return apiError("Not available.", 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }
  const parsed = discountValidateSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request.", 400);
  }
  const code = parsed.data.code.toUpperCase();
  const servicePrice = parsed.data.servicePrice;

  const { data: discount, error } = await supabase
    .from("discounts")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .single();

  if (error || !discount) {
    return apiError("Invalid discount code.", 404);
  }

  const today = new Date().toISOString().split("T")[0];
  if (discount.valid_from && today < discount.valid_from) {
    return apiError("This discount is not yet active.", 400);
  }
  if (discount.valid_until && today > discount.valid_until) {
    return apiError("This discount has expired.", 400);
  }
  if (discount.max_uses && discount.uses_count >= discount.max_uses) {
    return apiError("This discount has reached its usage limit.", 400);
  }
  if (discount.min_purchase && servicePrice < discount.min_purchase) {
    return apiError(`Minimum purchase of $${(discount.min_purchase / 100).toFixed(0)} required.`, 400);
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (discount.type === "percentage") {
    discountAmount = Math.round(servicePrice * (discount.value / 100));
  } else {
    discountAmount = Math.min(discount.value, servicePrice);
  }

  return apiSuccess({
    valid: true,
    code: discount.code,
    description: discount.description,
    type: discount.type,
    value: discount.value,
    discountAmount,
    finalPrice: servicePrice - discountAmount,
  });
}
