import { NextRequest, NextResponse } from "next/server";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactCreateSchema } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit({
    key: `contact:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many messages sent. Please wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  if (!hasSupabaseConfig) {
    return NextResponse.json(
      { error: "Contact backend is not configured. Please call us directly at (818) 662-5665." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }
  const { name, email, phone, service, message, turnstileToken } = parsed.data;

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return NextResponse.json({ error: turnstile.error }, { status: 400 });
  }

  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    phone,
    service,
    message,
  });

  if (error) {
    console.error("Error saving contact message:", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

