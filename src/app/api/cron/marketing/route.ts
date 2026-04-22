import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key && process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY required");
  return new Resend(key || "re_placeholder");
}

const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

function birthdayTemplate(name: string) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px;">THE LOOK HAIR SALON</h1>
        <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px;">HAPPY BIRTHDAY</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #eee;">
        <p style="color: #282936;">Hi ${name},</p>
        <p style="color: #666;">Happy birthday from everyone at The Look! 🎉</p>
        <p style="color: #666;">As our gift to you, enjoy <strong>20% off</strong> any service this month. Use code <strong style="color: #c2274b; font-size: 18px;">BDAY20</strong> at booking.</p>
        <p style="color: #666;">Treat yourself — you deserve it!</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.thelookhairsalonla.com/book" style="background: #c2274b; color: white; padding: 12px 30px; text-decoration: none; display: inline-block;">Book Your Birthday Appointment</a>
        </div>
      </div>
    </div>
  `;
}

function weMissYouTemplate(name: string) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px;">THE LOOK HAIR SALON</h1>
        <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px;">WE MISS YOU</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #eee;">
        <p style="color: #282936;">Hi ${name},</p>
        <p style="color: #666;">It&apos;s been a while since we&apos;ve seen you! Ready for a refresh?</p>
        <p style="color: #666;">Come back and enjoy <strong>15% off</strong> your next visit with code <strong style="color: #c2274b; font-size: 18px;">WELCOMEBACK</strong>.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.thelookhairsalonla.com/book" style="background: #c2274b; color: white; padding: 12px 30px; text-decoration: none; display: inline-block;">Book Now</a>
        </div>
      </div>
    </div>
  `;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  if (!hasSupabaseConfig) return apiSuccess({ sent: 0, reason: "Database not configured" });

  const resend = getResend();
  let birthdaySent = 0;
  let winbackSent = 0;

  // ── Birthday emails ──
  const today = new Date();
  const todayMmDd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data: birthdayClients } = await supabase
    .from("client_profiles")
    .select("email, name")
    .eq("birthday", todayMmDd);

  for (const client of birthdayClients || []) {
    try {
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: `Happy Birthday, ${client.name}! 🎂 Your gift inside`,
        html: birthdayTemplate(client.name),
      });
      birthdaySent++;
    } catch (err) {
      logError("cron/marketing birthday", err);
    }
  }

  // ── We miss you emails (clients who haven't booked in 60+ days) ──
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: recentAppts } = await supabase
    .from("appointments")
    .select("client_email, client_name, date")
    .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
    .lte("date", sixtyDaysAgo.toISOString().split("T")[0])
    .eq("status", "completed");

  // Group by email, find those whose LAST appointment was in this window
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastByEmail: Record<string, any> = {};
  for (const a of recentAppts || []) {
    if (!lastByEmail[a.client_email] || a.date > lastByEmail[a.client_email].date) {
      lastByEmail[a.client_email] = a;
    }
  }

  // Check if they have ANY appointment more recent
  for (const email of Object.keys(lastByEmail)) {
    const { data: newer } = await supabase
      .from("appointments")
      .select("id")
      .eq("client_email", email)
      .gt("date", sixtyDaysAgo.toISOString().split("T")[0])
      .limit(1);

    if (newer && newer.length > 0) continue; // they've come back, skip

    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: "We miss you at The Look! 💁‍♀️",
        html: weMissYouTemplate(lastByEmail[email].client_name),
      });
      winbackSent++;
    } catch (err) {
      logError("cron/marketing winback", err);
    }
  }

  return apiSuccess({ birthdaySent, winbackSent });
}
