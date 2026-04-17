import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { Resend } from "resend";
import { NextRequest } from "next/server";
import crypto from "crypto";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key && process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY required");
  return new Resend(key || "re_placeholder");
}

// POST: request a magic link
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit({ key: `magic:${ip}`, limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) return apiError("Too many requests.", 429);

  if (!hasSupabaseConfig) return apiError("Not available.", 503);

  const body = await request.json();
  const email = (body.email || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return apiError("Valid email required.", 400);

  // Verify email has at least one appointment
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, client_name")
    .eq("client_email", email)
    .limit(1);

  if (!appts || appts.length === 0) {
    // Don't reveal whether the email exists — return success anyway
    return apiSuccess({ success: true, message: "If you have an account, a login link has been sent." });
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

  try {
    await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: email,
      subject: "Sign in to The Look Hair Salon",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-family: Georgia, serif; color: #282936;">THE LOOK HAIR SALON</h1>
          <p>Hi ${appts[0].client_name || "there"},</p>
          <p>Click the button below to sign in to your account. This link is valid for 15 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicUrl}" style="background: #c2274b; color: white; padding: 14px 32px; text-decoration: none; display: inline-block; font-weight: bold;">Sign In</a>
          </div>
          <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    logError("magic-link email", err);
  }

  return apiSuccess({ success: true, message: "Check your email for a login link." });
}
