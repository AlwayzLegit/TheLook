import { NextResponse } from "next/server";
import { getActiveDepositRules } from "@/lib/depositRules";

// Public — the /book client fetches these to mirror the server's
// deposit-required computation before submission. Only active rules
// are returned, and only the fields needed to evaluate a match.
//
// CORS is tightened to the prod origin (P3-4). Local dev origins match
// explicitly so the booking flow still works out of the box.
export const revalidate = 60;

const ALLOWED_ORIGINS = new Set<string>([
  "https://www.thelookhairsalonla.com",
  "https://thelookhairsalonla.com",
  "http://localhost:3000",
  "http://localhost:3001",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }
  return {};
}

export async function GET(request: Request) {
  const rules = await getActiveDepositRules();
  const safe = rules.map((r) => ({
    id: r.id,
    trigger_type: r.trigger_type,
    trigger_value: r.trigger_value,
    deposit_cents: r.deposit_cents,
  }));
  return NextResponse.json(safe, { headers: corsHeaders(request.headers.get("origin")) });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(request.headers.get("origin")),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
