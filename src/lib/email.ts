import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key && process.env.NODE_ENV === "production") {
    throw new Error("RESEND_API_KEY is required in production");
  }
  return new Resend(key || "re_placeholder");
}

const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const SALON_EMAIL = process.env.ADMIN_EMAIL || "look_hairsalon@yahoo.com";

interface AppointmentDetails {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  stylistName: string;
  date: string;
  startTime: string;
  cancelUrl?: string;
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export async function sendBookingConfirmation(details: AppointmentDetails) {
  const { clientName, clientEmail, serviceName, stylistName, date, startTime, cancelUrl } = details;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
        <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">BOOKING CONFIRMATION</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #eee;">
        <p style="color: #282936; margin: 0 0 20px;">Hi ${clientName},</p>
        <p style="color: #666; margin: 0 0 20px;">Your appointment has been booked! Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Service</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${serviceName}</td></tr>
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Stylist</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${stylistName}</td></tr>
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Date</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${formatDate(date)}</td></tr>
          <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Time</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${formatTime(startTime)}</td></tr>
        </table>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 13px; margin: 0;">919 South Central Ave Suite #E, Glendale, CA 91204</p>
          <p style="color: #666; font-size: 13px; margin: 4px 0;">(818) 662-5665</p>
        </div>
        ${cancelUrl ? `<div style="margin-top: 20px; text-align: center;"><a href="${cancelUrl}" style="color: #c2274b; font-size: 13px;">Cancel</a> &nbsp;·&nbsp; <a href="${cancelUrl.replace("/book/cancel", "/book/reschedule")}" style="color: #c2274b; font-size: 13px;">Reschedule</a></div>` : ""}
      </div>
      <p style="text-align: center; color: #999; font-size: 11px; margin-top: 20px;">
        Please note: A $50 deposit may be required for select color/styling services. 25% cancellation fee applies for no-shows or cancellations within 24 hours.
      </p>
    </div>
  `;

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: `Booking Confirmed — ${formatDate(date)} at ${formatTime(startTime)}`,
      html,
    });

    // Notify salon
    await getResend().emails.send({
      from: FROM,
      to: SALON_EMAIL,
      subject: `New Booking: ${clientName} — ${serviceName} with ${stylistName}`,
      html: html.replace("BOOKING CONFIRMATION", "NEW BOOKING ALERT"),
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export async function sendCancellationEmail(details: Omit<AppointmentDetails, "cancelUrl">) {
  const { clientName, clientEmail, serviceName, date, startTime } = details;

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: `Appointment Cancelled — ${formatDate(date)}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #eee;">
            <p style="color: #282936;">Hi ${clientName},</p>
            <p style="color: #666;">Your appointment for <strong>${serviceName}</strong> on <strong>${formatDate(date)}</strong> at <strong>${formatTime(startTime)}</strong> has been cancelled.</p>
            <p style="color: #666;">We'd love to see you again! Call us at (818) 662-5665 or visit our website to rebook.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
  }
}

export async function sendReminderEmail(details: AppointmentDetails) {
  const { clientName, clientEmail, serviceName, stylistName, date, startTime, cancelUrl } = details;

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: `Reminder: Your appointment tomorrow at ${formatTime(startTime)}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
            <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">APPOINTMENT REMINDER</p>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #eee;">
            <p style="color: #282936;">Hi ${clientName},</p>
            <p style="color: #666;">Just a friendly reminder about your appointment tomorrow:</p>
            <p style="color: #282936; font-weight: bold; font-size: 16px; margin: 15px 0;">${serviceName} with ${stylistName}<br/>${formatDate(date)} at ${formatTime(startTime)}</p>
            <p style="color: #666; font-size: 13px;">919 South Central Ave Suite #E, Glendale, CA 91204</p>
            ${cancelUrl ? `<p style="margin-top: 15px;"><a href="${cancelUrl}" style="color: #c2274b; font-size: 13px;">Need to cancel or reschedule?</a></p>` : ""}
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send reminder email:", error);
  }
}

interface StatusChangeDetails {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  stylistName: string;
  date: string;
  startTime: string;
  newStatus: string;
  cancelToken?: string | null;
}

export async function sendStatusChangeEmail(details: StatusChangeDetails) {
  const { clientName, clientEmail, serviceName, date, startTime, newStatus, cancelToken } = details;

  const statusMessages: Record<string, { subject: string; heading: string; body: string }> = {
    confirmed: {
      subject: `Appointment Confirmed — ${formatDate(date)} at ${formatTime(startTime)}`,
      heading: "APPOINTMENT CONFIRMED",
      body: "Great news! Your appointment has been confirmed. We look forward to seeing you!",
    },
    cancelled: {
      subject: `Appointment Cancelled — ${formatDate(date)}`,
      heading: "APPOINTMENT CANCELLED",
      body: "Your appointment has been cancelled. If this was a mistake, please call us to rebook.",
    },
    completed: {
      subject: "Thanks for Visiting The Look Hair Salon!",
      heading: "THANK YOU",
      body: "We hope you loved your new look! If you have a moment, we'd appreciate a review on Yelp or Google. See you next time!",
    },
    no_show: {
      subject: `Missed Appointment — ${formatDate(date)}`,
      heading: "MISSED APPOINTMENT",
      body: "We missed you today! Please call us at (818) 662-5665 to reschedule.",
    },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";
  const cancelLink = cancelToken && newStatus === "confirmed"
    ? `<div style="margin-top: 20px; text-align: center;"><a href="${baseUrl}/book/cancel?token=${cancelToken}" style="color: #c2274b; font-size: 13px;">Need to cancel? Click here</a></div>`
    : "";

  const reviewLinks = newStatus === "completed"
    ? `<div style="margin-top: 20px; text-align: center;">
        <a href="https://www.yelp.com/biz/the-look-hair-salon-glendale" style="color: #c2274b; font-size: 13px; margin-right: 16px;">Review on Yelp</a>
        <a href="https://www.google.com/maps/place/The+Look+Hair+Salon" style="color: #c2274b; font-size: 13px;">Review on Google</a>
      </div>`
    : "";

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: msg.subject,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
            <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">${msg.heading}</p>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #eee;">
            <p style="color: #282936; margin: 0 0 20px;">Hi ${clientName},</p>
            <p style="color: #666; margin: 0 0 20px;">${msg.body}</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Service</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${serviceName}</td></tr>
              <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Date</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${formatDate(date)}</td></tr>
              <tr><td style="padding: 10px 0; color: #999; font-size: 14px;">Time</td><td style="padding: 10px 0; color: #282936; font-weight: bold;">${formatTime(startTime)}</td></tr>
            </table>
            ${cancelLink}
            ${reviewLinks}
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 13px; margin: 0;">919 South Central Ave Suite #E, Glendale, CA 91204</p>
              <p style="color: #666; font-size: 13px; margin: 4px 0;">(818) 662-5665</p>
            </div>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send status change email:", error);
  }
}

interface ReviewRequestDetails {
  clientName: string;
  clientEmail: string;
  stylistName: string;
  serviceName: string;
  date: string;
  reviewUrl: string;
  googleUrl: string;
  yelpUrl: string;
}

interface ReviewDigestItem {
  source: "Google" | "Yelp";
  author: string;
  rating: number;
  text: string;
  relative: string;
  url?: string;
}

export async function sendReviewDigestEmail(items: ReviewDigestItem[], ratingSnapshot: { google: string; yelp: string }) {
  if (items.length === 0) return;

  const row = (r: ReviewDigestItem) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <div style="font-size: 12px; color: #c9a96e; letter-spacing: 2px; text-transform: uppercase;">${r.source} · ${r.rating}★ · ${r.relative}</div>
        <div style="font-weight: bold; color: #282936; margin-top: 4px;">${r.author}</div>
        <div style="color: #666; margin-top: 6px; font-size: 14px; line-height: 1.5;">${r.text.replace(/</g, "&lt;")}</div>
        ${r.url ? `<a href="${r.url}" style="color: #c2274b; font-size: 12px; margin-top: 8px; display: inline-block;">Respond on ${r.source} &rarr;</a>` : ""}
      </td>
    </tr>`;

  try {
    await getResend().emails.send({
      from: FROM,
      to: SALON_EMAIL,
      subject: `${items.length} new review${items.length === 1 ? "" : "s"} this week`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
            <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">WEEKLY REVIEW DIGEST</p>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #eee;">
            <p style="color: #666; margin: 0 0 15px;">Current ratings: ${ratingSnapshot.google ? `Google ${ratingSnapshot.google}★` : ""}${ratingSnapshot.google && ratingSnapshot.yelp ? " · " : ""}${ratingSnapshot.yelp ? `Yelp ${ratingSnapshot.yelp}★` : ""}</p>
            <h2 style="color: #282936; font-family: Georgia, serif; font-size: 20px; margin: 20px 0 15px;">${items.length} new review${items.length === 1 ? "" : "s"}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${items.map(row).join("")}
            </table>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send review digest email:", error);
  }
}

export async function sendReviewRequestEmail(details: ReviewRequestDetails) {
  const { clientName, clientEmail, stylistName, serviceName, date, reviewUrl, googleUrl, yelpUrl } = details;

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: "How was your visit to The Look?",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: Georgia, serif; color: #282936; font-size: 28px; margin: 0;">THE LOOK HAIR SALON</h1>
            <p style="color: #c9a96e; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">THANK YOU</p>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #eee;">
            <p style="color: #282936; margin: 0 0 15px;">Hi ${clientName},</p>
            <p style="color: #666; line-height: 1.6;">
              Thank you for coming in for your ${serviceName} with ${stylistName} on ${formatDate(date)}.
              If you loved your visit, a quick review on Google or Yelp would mean the world to us —
              it helps other Glendale locals find us and tells our stylists they&#39;re doing it right.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${googleUrl}" style="display: inline-block; background: #282936; color: white; padding: 12px 24px; text-decoration: none; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin: 6px;">Review on Google</a>
              <a href="${yelpUrl}" style="display: inline-block; background: #c2274b; color: white; padding: 12px 24px; text-decoration: none; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin: 6px;">Review on Yelp</a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              Or visit <a href="${reviewUrl}" style="color: #c2274b;">${reviewUrl}</a> to pick either one.
            </p>
            <p style="color: #666; font-size: 13px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
              Had an issue instead? Reply to this email or call us at (818) 662-5665 — we&#39;d rather hear
              about it first so we can make it right.
            </p>
          </div>
          <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
            919 South Central Ave Suite #E, Glendale, CA 91204
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send review request email:", error);
  }
}
