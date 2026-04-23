import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { signClientSession, verifyClientSession } from "@/lib/clientSession";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

// POST: exchange magic link token for a session cookie
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig) return apiError("Not available.", 503);

  // Throttle token redemption per-IP so nobody can grind a 32-hex token
  // space by retrying. The issuance endpoint is per-email-rate-limited,
  // but redemption was wide open before this.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit({
    key: `client-session-redeem:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return apiError("Too many attempts. Try again later.", 429);

  const body = await request.json();
  const token = body.token;
  if (!token) return apiError("Token required.", 400);

  const { data: row } = await supabase
    .from("client_access_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (!row) return apiError("Invalid or expired link.", 404);
  if (new Date(row.expires_at) < new Date()) return apiError("This link has expired.", 400);
  if (row.used_at) return apiError("This link has already been used.", 400);

  // Mark as used
  await supabase
    .from("client_access_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  // HMAC-signed session cookie — the payload carries the email, the
  // signature prevents any client from forging one themselves. Plaintext
  // before this, which meant anyone could set the cookie and impersonate
  // another client's appointment portal access.
  const signed = signClientSession(row.email);
  const response = NextResponse.json({ success: true, email: row.email });
  response.cookies.set("thelook_client_session", signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}

// GET: check current session
export async function GET(request: NextRequest) {
  const raw = request.cookies.get("thelook_client_session")?.value;
  const email = verifyClientSession(raw);
  if (!email) return apiError("Not signed in.", 401);
  return apiSuccess({ email });
}

// DELETE: sign out
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("thelook_client_session");
  return response;
}
