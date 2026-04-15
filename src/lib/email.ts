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
        ${cancelUrl ? `<div style="margin-top: 20px; text-align: center;"><a href="${cancelUrl}" style="color: #c2274b; font-size: 13px;">Need to cancel? Click here</a></div>` : ""}
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
