import { getActiveDepositRules } from "@/lib/depositRules";
import { apiSuccess } from "@/lib/apiResponse";

// Public — the /book client fetches these to mirror the server's
// deposit-required computation before submission. Only active rules
// are returned, and only the fields needed to evaluate a match.
export const revalidate = 60;

export async function GET() {
  const rules = await getActiveDepositRules();
  const safe = rules.map((r) => ({
    id: r.id,
    trigger_type: r.trigger_type,
    trigger_value: r.trigger_value,
    deposit_cents: r.deposit_cents,
  }));
  return apiSuccess(safe);
}
