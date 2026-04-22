import { NextRequest } from "next/server";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getSessionUser, isAdmin } from "@/lib/roles";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { depositRuleSchema } from "@/lib/validation";
import { getAllDepositRules } from "@/lib/depositRules";
import { logAdminAction } from "@/lib/auditLog";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return apiError("Admins only.", 403);
  const rules = await getAllDepositRules();
  return apiSuccess(rules);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return apiError("Admins only.", 403);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const parsed = depositRuleSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path?.join(".") || "payload";
    return apiError(`${field}: ${first?.message || "invalid"}`, 400);
  }

  const { data, error } = await supabase
    .from("deposit_rules")
    .insert({
      name: parsed.data.name,
      trigger_type: parsed.data.trigger_type,
      trigger_value: parsed.data.trigger_value,
      deposit_cents: parsed.data.deposit_cents,
      active: parsed.data.active ?? true,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    logError("deposit-rules POST", error);
    // Surface the Postgres message so the admin can self-diagnose
    // (missing migration → "relation ... does not exist", etc.).
    return apiError(`Failed to create rule: ${error.message}`, 500);
  }

  await logAdminAction("deposit_rule.create", JSON.stringify({ id: data.id, name: data.name }));
  return apiSuccess(data, 201);
}
