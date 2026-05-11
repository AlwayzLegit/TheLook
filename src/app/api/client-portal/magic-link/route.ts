import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getBranding } from "@/lib/branding";
import { sendRawEmail } from "@/lib/email";
import { NextRequest } from "next/server";
import crypto from "crypto";

// Constant-ish "ok" response so we never leak whether an email exists.
const NOOP_RESPONSE = { success: true, message: "If you have an account, a login link has been sent." };

// POST: request a magic link
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // B-15/16 — defense in depth:
  //   1. Per-IP rate limit (existing).
  //   2. Per-email rate limit so one IP can't enumerate addresses by
  //      hammering the form for many different emails.
  //   3. Turnstile when configured. Skipped in dev / when no site key.
  const ipRl = await checkRateLimit({ key: `magic:ip:${ip}`, limit: 8, windowMs: 15 * 60 * 1000 });
  if (!ipRl.ok) return apiError("Too many requests.", 429);

  if (!hasSupabaseConfig) return apiError("Not available.", 503);

  const body = await request.json();
  const email = (body.email || "").toLowerCase().trim();
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;

  if (!email || !email.includes("@")) return apiError("Valid email required.", 400);

  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    const t = await verifyTurnstileToken(turnstileToken, ip);
    if (!t.ok) return apiError(t.error || "Captcha verification failed.", 400);
  }

  const emailRl = await checkRateLimit({ key: `magic:email:${email}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!emailRl.ok) {
    // Surface a constant-time-ish noop instead of revealing the rate limit
    // — same response a non-existent email gets.
    return apiSuccess(NOOP_RESPONSE);
  }

  // Verify email has at least one appointment
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, client_name")
    .eq("client_email", email)
    .limit(1);

  if (!appts || appts.length === 0) {
    return apiSuccess(NOOP_RESPONSE);
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  await supabase.from("client_access_tokens").insert({
    email,
    token,
    expires_at: expiresAt.toISOString(),
  });

  // Send magic link email
  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  const magicUrl = `${baseUrl}/my?token=${token}`;
  const brand = await getBranding();

  await sendRawEmail({
    to: email,
    subject: `Sign in to ${brand.name}`,
    text: `Hi ${appts[0].client_name || "there"},\n\nClick the link below to sign in to your account. It's valid for 15 minutes.\n\n${magicUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-family: Georgia, serif; color: #282936;">${brand.name.toUpperCase()}</h1>
        <p>Hi ${appts[0].client_name || "there"},</p>
        <p>Click the button below to sign in to your account. This link is valid for 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicUrl}" style="background: #c2274b; color: white; padding: 14px 32px; text-decoration: none; display: inline-block; font-weight: bold;">Sign In</a>
        </div>
        <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    event: "email.client_portal.magic_link",
  });

  // Same noop-shape response so timing + body don't leak email existence.
  return apiSuccess(NOOP_RESPONSE);
}
