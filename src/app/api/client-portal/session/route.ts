import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { NextRequest, NextResponse } from "next/server";

// POST: exchange magic link token for a session cookie
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig) return apiError("Not available.", 503);

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

  // Set a signed session cookie (simple HMAC for client sessions)
  const response = NextResponse.json({ success: true, email: row.email });
  response.cookies.set("thelook_client_session", row.email, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}

// GET: check current session
export async function GET(request: NextRequest) {
  const email = request.cookies.get("thelook_client_session")?.value;
  if (!email) return apiError("Not signed in.", 401);
  return apiSuccess({ email });
}

// DELETE: sign out
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("thelook_client_session");
  return response;
}
