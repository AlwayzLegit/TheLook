import { supabase, hasSupabaseConfig } from "./supabase";

// Single source of truth for when a booking requires a deposit. Reads
// active rules from the `deposit_rules` table (seeded + managed from
// /admin/settings → Booking). Matching logic:
//   min_price_cents       : totalPriceCents >= trigger_value
//   min_duration_minutes  : totalDurationMinutes >= trigger_value
// If more than one rule matches, the highest deposit_cents wins.

export type DepositTriggerType = "min_price_cents" | "min_duration_minutes";

export interface DepositRule {
  id: string;
  name: string;
  trigger_type: DepositTriggerType;
  trigger_value: number;
  deposit_cents: number;
  active: boolean;
  sort_order: number;
}

export interface DepositComputation {
  requiresDeposit: boolean;
  depositCents: number;
  matchedRule: DepositRule | null;
}

const EMPTY: DepositComputation = { requiresDeposit: false, depositCents: 0, matchedRule: null };

export async function getActiveDepositRules(): Promise<DepositRule[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from("deposit_rules")
    .select("id,name,trigger_type,trigger_value,deposit_cents,active,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[depositRules] fetch failed", error);
    return [];
  }
  return (data || []) as DepositRule[];
}

export async function getAllDepositRules(): Promise<DepositRule[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from("deposit_rules")
    .select("id,name,trigger_type,trigger_value,deposit_cents,active,sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[depositRules] fetchAll failed", error);
    return [];
  }
  return (data || []) as DepositRule[];
}

export function ruleMatches(
  rule: DepositRule,
  ctx: { totalPriceCents: number; totalDurationMinutes: number },
): boolean {
  if (!rule.active) return false;
  switch (rule.trigger_type) {
    case "min_price_cents":
      return ctx.totalPriceCents >= rule.trigger_value;
    case "min_duration_minutes":
      return ctx.totalDurationMinutes >= rule.trigger_value;
    default:
      return false;
  }
}

export function computeDepositFromRules(
  rules: DepositRule[],
  ctx: { totalPriceCents: number; totalDurationMinutes: number },
): DepositComputation {
  let best = 0;
  let matched: DepositRule | null = null;
  for (const r of rules) {
    if (!ruleMatches(r, ctx)) continue;
    if (r.deposit_cents > best) {
      best = r.deposit_cents;
      matched = r;
    }
  }
  if (best === 0) return EMPTY;
  return { requiresDeposit: true, depositCents: best, matchedRule: matched };
}

export async function computeRequiredDeposit(ctx: {
  totalPriceCents: number;
  totalDurationMinutes: number;
}): Promise<DepositComputation> {
  const rules = await getActiveDepositRules();
  return computeDepositFromRules(rules, ctx);
}
