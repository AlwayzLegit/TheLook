import { apiSuccess } from "@/lib/apiResponse";
import { getSetting } from "@/lib/settings";

// Tiny public endpoint the booking DepositForm hits so it can show the
// client the processing-fee breakdown BEFORE card entry. Returns only
// the percentage — the actual dollar amount is computed on the server
// when the PaymentIntent is created so the client can't spoof the fee.
export async function GET() {
  const raw = await getSetting("deposit_cc_fee_pct").catch(() => null);
  const n = raw ? parseFloat(String(raw)) : 0;
  const pct = Number.isFinite(n) && n > 0 && n <= 10 ? n : 0;
  return apiSuccess({ pct });
}
