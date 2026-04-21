import { Resend } from "resend";
import { brandedEmail, detailsTable, formatDate, formatTime } from "./emailTemplate";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key && process.env.NODE_ENV === "production") {
    throw new Error("RESEND_API_KEY is required in production");
  }
  return new Resend(key || "re_placeholder");
}

const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const SALON_EMAIL = process.env.ADMIN_EMAIL || "thelook_hairsalon@yahoo.com";
const SITE = process.env.NEXTAUTH_URL || "https://www.thelookhairsalonla.com";

interface AppointmentDetails {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  stylistName: string;
  date: string;
  startTime: string;
  cancelUrl?: string;
  // True when the customer chose "Any Stylist" — the email renders that
  // wording instead of the resolved stylist's name so expectations stay
  // aligned with what they picked.
  anyStylist?: boolean;
}

// ----------------------------------------------------------------------
// Client-facing emails
// ----------------------------------------------------------------------

export async function sendBookingConfirmation(details: AppointmentDetails) {
  const { clientName, clientEmail, serviceName, stylistName, date, startTime, cancelUrl, anyStylist } = details;
  const rescheduleUrl = cancelUrl ? cancelUrl.replace("/book/cancel", "/book/reschedule") : undefined;
  const stylistDisplay = anyStylist ? "Any available stylist" : stylistName;

  const html = brandedEmail({
    preheader: `Your ${serviceName} booking request for ${formatDate(date)} is pending.`,
    kicker: "Appointment pending",
    headline: `Thanks, ${clientName.split(" ")[0]} — we got your request.`,
    bodyHtml: `
      <p style="margin: 0 0 14px;">
        Your appointment is <strong>pending</strong>. The salon will review your booking
        and send a final confirmation by email shortly.
      </p>
      ${detailsTable([
        ["Service", serviceName],
        ["Stylist", stylistDisplay],
        ["Date", formatDate(date)],
        ["Time", formatTime(startTime)],
      ])}
      <p style="margin: 18px 0 8px;"><strong>Before your visit</strong></p>
      <p style="margin: 0 0 14px;">
        Please arrive with clean hair unless otherwise instructed for your specific service.
        For color services, 1–2 days of unwashed hair is recommended. If you have a
        particular style or color in mind, feel free to bring photos for reference — this
        helps ensure we achieve your desired look. We look forward to seeing you soon!
      </p>
      <p style="margin: 0 0 14px;">
        Need to change something? Use the Reschedule link below, or call us — we&#39;re friendly
        on the phone.
      </p>
    `,
    ctaLabel: cancelUrl ? "Manage booking" : undefined,
    ctaUrl: rescheduleUrl,
    secondaryLabel: cancelUrl ? "Cancel this appointment" : undefined,
    secondaryUrl: cancelUrl,
    signoff: "See you soon — The Look Hair Salon",
  });

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: `We got your booking request — ${formatDate(date)} at ${formatTime(startTime)}`,
      html,
    });

    // Simultaneously notify the salon.
    await getResend().emails.send({
      from: FROM,
      to: SALON_EMAIL,
      subject: `New booking: ${clientName} — ${serviceName} with ${stylistDisplay}`,
      html: brandedEmail({
        preheader: `New booking for ${clientName} on ${formatDate(date)}.`,
        kicker: "New booking alert",
        headline: `${clientName} just booked`,
        bodyHtml: `
          ${detailsTable([
            ["Client", `${clientName}<br/><span style="color:#999; font-size:12px;">${clientEmail}</span>`],
            ["Service", serviceName],
            ["Stylist", anyStylist ? `${stylistDisplay} <span style="background:#999;color:#fff;padding:2px 6px;font-size:10px;">ANY</span> (resolved → ${stylistName})` : stylistName],
            ["Date", formatDate(date)],
            ["Time", formatTime(startTime)],
          ])}
          <p style="margin: 18px 0 0;">Head into admin to approve or reschedule.</p>
        `,
        ctaLabel: "Review in admin",
        ctaUrl: `${SITE}/admin/appointments`,
        signoff: "Auto-sent by The Look booking system",
        includePolicyFooter: false,
      }),
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
      subject: `Appointment cancelled — ${formatDate(date)}`,
      html: brandedEmail({
        preheader: `Your ${serviceName} appointment on ${formatDate(date)} has been cancelled.`,
        kicker: "Appointment cancelled",
        headline: "Your appointment was cancelled.",
        bodyHtml: `
          <p style="margin: 0 0 14px;">Hi ${clientName},</p>
          <p style="margin: 0 0 14px;">
            Your appointment for <strong>${serviceName}</strong> on <strong>${formatDate(date)}</strong>
            at <strong>${formatTime(startTime)}</strong> has been cancelled.
          </p>
          <p style="margin: 0 0 6px;">
            We&#39;d love to see you back in the chair. Book again anytime:
          </p>
        `,
        ctaLabel: "Book a new appointment",
        ctaUrl: `${SITE}/book`,
        signoff: "— The Look Hair Salon",
      }),
    });
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
  }
}

export async function sendReminderEmail(details: AppointmentDetails) {
  const { clientName, clientEmail, serviceName, stylistName, date, startTime, cancelUrl } = details;
  const rescheduleUrl = cancelUrl ? cancelUrl.replace("/book/cancel", "/book/reschedule") : undefined;

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: `Reminder: your appointment tomorrow at ${formatTime(startTime)}`,
      html: brandedEmail({
        preheader: `See you tomorrow at ${formatTime(startTime)} for ${serviceName}.`,
        kicker: "Appointment reminder",
        headline: `See you tomorrow, ${clientName.split(" ")[0]}.`,
        bodyHtml: `
          <p style="margin: 0 0 14px;">
            Quick reminder — here&#39;s what we have on the books:
          </p>
          ${detailsTable([
            ["Service", serviceName],
            ["Stylist", stylistName],
            ["Date", formatDate(date)],
            ["Time", formatTime(startTime)],
          ])}
          <p style="margin: 18px 0 6px;">
            Parking is free in our lot on South Central Ave. Please arrive a few minutes early so
            we can start on time.
          </p>
          <p style="margin: 0 0 0;">
            Need to move things around? Use the link below — keep in mind cancellations within
            24 hours incur the 25% fee and forfeit your deposit.
          </p>
        `,
        ctaLabel: cancelUrl ? "Reschedule or cancel" : undefined,
        ctaUrl: rescheduleUrl || cancelUrl,
        signoff: "See you soon — The Look Hair Salon",
      }),
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
  const { clientName, clientEmail, serviceName, stylistName, date, startTime, newStatus, cancelToken } = details;

  const detailRows = detailsTable([
    ["Service", serviceName],
    ["Stylist", stylistName],
    ["Date", formatDate(date)],
    ["Time", formatTime(startTime)],
  ]);

  const cancelUrl = cancelToken ? `${SITE}/book/cancel?token=${cancelToken}` : undefined;
  const rescheduleUrl = cancelToken ? `${SITE}/book/reschedule?token=${cancelToken}` : undefined;

  const templates: Record<string, { subject: string; kicker: string; headline: string; body: string; ctaLabel?: string; ctaUrl?: string; secondaryLabel?: string; secondaryUrl?: string }> = {
    confirmed: {
      subject: `You're confirmed — ${formatDate(date)} at ${formatTime(startTime)}`,
      kicker: "Appointment confirmed",
      headline: "You're confirmed.",
      body: `
        <p style="margin: 0 0 14px;">Hi ${clientName}, your appointment is officially on the books:</p>
        ${detailRows}
        <p style="margin: 18px 0 0;">
          Come in with unwashed hair (1–2 days is ideal) for color work, and bring photos if
          you have a specific look in mind. See you soon!
        </p>
      `,
      ctaLabel: cancelUrl ? "Reschedule" : undefined,
      ctaUrl: rescheduleUrl,
      secondaryLabel: cancelUrl ? "Cancel this appointment" : undefined,
      secondaryUrl: cancelUrl,
    },
    cancelled: {
      subject: `Appointment cancelled — ${formatDate(date)}`,
      kicker: "Appointment cancelled",
      headline: "Your appointment was cancelled.",
      body: `
        <p style="margin: 0 0 14px;">Hi ${clientName}, the following appointment has been cancelled:</p>
        ${detailRows}
        <p style="margin: 18px 0 0;">
          If this was a mistake, please call us at (818) 662-5665. Otherwise we&#39;d love to
          see you again whenever works for you.
        </p>
      `,
      ctaLabel: "Book again",
      ctaUrl: `${SITE}/book`,
    },
    completed: {
      subject: "We loved having you at The Look!",
      kicker: "Hope you loved it",
      headline: "We hope you're loving your new look.",
      body: `
        <p style="margin: 0 0 14px;">Hi ${clientName},</p>
        <p style="margin: 0 0 14px;">
          Thank you for choosing The Look Hair Salon — it was wonderful having you in. We hope
          you&#39;re loving the result.
        </p>
        <p style="margin: 0 0 14px;">
          If you have a moment, a quick Google or Yelp review helps other neighbors find us and
          lets our team know we&#39;re on the right track.
        </p>
        <p style="margin: 0 0 0;">See you next time!</p>
      `,
      ctaLabel: "Leave a review",
      ctaUrl: `${SITE}/review`,
    },
    no_show: {
      subject: `Missed appointment — ${formatDate(date)}`,
      kicker: "Missed appointment",
      headline: "We missed you today.",
      body: `
        <p style="margin: 0 0 14px;">Hi ${clientName},</p>
        <p style="margin: 0 0 14px;">
          We held your slot for <strong>${serviceName}</strong> on <strong>${formatDate(date)}</strong>
          at <strong>${formatTime(startTime)}</strong>, but you didn&#39;t make it. Per the
          cancellation policy you agreed to at booking, your $50 deposit is forfeited and a 25%
          cancellation fee may be applied to the card on file.
        </p>
        <p style="margin: 0 0 0;">
          If something came up we&#39;d love to rebook you. Call us at (818) 662-5665 and we&#39;ll
          find another time.
        </p>
      `,
      ctaLabel: "Book a new appointment",
      ctaUrl: `${SITE}/book`,
    },
  };

  const t = templates[newStatus];
  if (!t) return;

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: t.subject,
      html: brandedEmail({
        preheader: t.headline,
        kicker: t.kicker,
        headline: t.headline,
        bodyHtml: t.body,
        ctaLabel: t.ctaLabel,
        ctaUrl: t.ctaUrl,
        secondaryLabel: t.secondaryLabel,
        secondaryUrl: t.secondaryUrl,
        signoff: "— The Look Hair Salon",
        // Policy footer only shows on no-show / cancellation where it's
        // the most relevant. Confirmed + completed skip it to keep the
        // cadence warm.
        includePolicyFooter: newStatus === "cancelled" || newStatus === "no_show",
      }),
    });
  } catch (error) {
    console.error("Failed to send status change email:", error);
  }
}

// ----------------------------------------------------------------------
// Staff-facing emails
// ----------------------------------------------------------------------

interface StaffNewBookingDetails {
  recipients: string[];
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  serviceName: string;
  stylistName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPriceText?: string | null;
  notes?: string | null;
  requestedStylist: boolean;
  depositRequiredCents: number;
  depositPaid: boolean;
  approveUrl: string;
}

export async function sendStaffNewBookingEmail(details: StaffNewBookingDetails) {
  const {
    recipients, clientName, clientEmail, clientPhone, serviceName, stylistName,
    date, startTime, endTime, totalPriceText, notes,
    requestedStylist, depositRequiredCents, depositPaid, approveUrl,
  } = details;
  if (recipients.length === 0) return;

  const stylistBadge = requestedStylist
    ? `<span style="background:#c2274b; color:#fff; padding:2px 8px; font-size:10px; letter-spacing:1px;">REQUESTED</span>`
    : `<span style="background:#999; color:#fff; padding:2px 8px; font-size:10px; letter-spacing:1px;">ANY STYLIST</span>`;

  const depositBadge = depositRequiredCents > 0
    ? `$${(depositRequiredCents / 100).toFixed(0)} ${depositPaid
        ? `<span style="color:#1b8a3a; font-weight:bold;">PAID</span>`
        : `<span style="color:#c2274b; font-weight:bold;">REQUIRED</span>`}`
    : "Not required";

  try {
    await getResend().emails.send({
      from: FROM,
      to: recipients,
      subject: `[ACTION REQUIRED] New booking: ${clientName} — ${serviceName}`,
      html: brandedEmail({
        preheader: `${clientName} booked ${serviceName} for ${formatDate(date)}.`,
        kicker: "New booking — needs approval",
        headline: `${clientName} just booked online`,
        bodyHtml: `
          ${detailsTable([
            ["Client", `${clientName}<br/><span style="color:#999; font-size:12px;">${clientEmail}${clientPhone ? " · " + clientPhone : ""}</span>`],
            ["Service", `${serviceName}${totalPriceText ? ` <span style="color:#c9a96e;">(${totalPriceText})</span>` : ""}`],
            ["Stylist", `${stylistName} ${stylistBadge}`],
            ["Date", formatDate(date)],
            ["Time", `${formatTime(startTime)} – ${formatTime(endTime)}`],
            ["Deposit", depositBadge],
            ...(notes ? [["Notes", notes.replace(/</g, "&lt;")] as [string, string]] : []),
          ])}
        `,
        ctaLabel: "Review & approve",
        ctaUrl: approveUrl,
        signoff: "Auto-sent by The Look booking system",
        includeSupportFooter: false,
        includePolicyFooter: false,
      }),
    });
  } catch (error) {
    console.error("Failed to send staff new-booking email:", error);
  }
}

interface StaffNewMessageDetails {
  recipients: string[];
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string;
  adminUrl: string;
}

// Staff alert when a new contact form lands. Mirrors the new-booking email
// shape so the inbox reads consistently.
export async function sendStaffNewMessageEmail(details: StaffNewMessageDetails) {
  const { recipients, name, email, phone, service, message, adminUrl } = details;
  if (recipients.length === 0) return;
  try {
    await getResend().emails.send({
      from: FROM,
      to: recipients,
      subject: `[Inbox] New contact message from ${name}`,
      html: brandedEmail({
        preheader: `${name} sent a message${service ? ` about ${service}` : ""}.`,
        kicker: "New contact form submission",
        headline: `${name} reached out`,
        bodyHtml: `
          ${detailsTable([
            ["From", `${name}<br/><span style="color:#999; font-size:12px;">${email}${phone ? " · " + phone : ""}</span>`],
            ...(service ? [["Service interest", service] as [string, string]] : []),
            ["Message", message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")],
          ])}
        `,
        ctaLabel: "Open in admin",
        ctaUrl: adminUrl,
        signoff: "Auto-sent by The Look",
        includeSupportFooter: false,
        includePolicyFooter: false,
      }),
    });
  } catch (error) {
    console.error("Failed to send staff new-message email:", error);
  }
}

// ----------------------------------------------------------------------
// Reviews
// ----------------------------------------------------------------------

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

export async function sendReviewRequestEmail(details: ReviewRequestDetails) {
  const { clientName, clientEmail, stylistName, serviceName, date, reviewUrl, googleUrl, yelpUrl } = details;

  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: "How was your visit?",
      html: brandedEmail({
        preheader: `We hope you loved your ${serviceName}.`,
        kicker: "How was it?",
        headline: "How was your visit?",
        bodyHtml: `
          <p style="margin: 0 0 14px;">Hi ${clientName},</p>
          <p style="margin: 0 0 14px;">
            We hope you&#39;re loving your <strong>${serviceName}</strong> with{" "}
            <strong>${stylistName}</strong> from ${formatDate(date)}. If you enjoyed your visit,
            a quick review on Google or Yelp would mean a lot — it&#39;s how other Glendale
            neighbors find us.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0;">
            <tr>
              <td align="center">
                <a href="${googleUrl}" style="display:inline-block; background:#282936; color:#fff; text-decoration:none; font-size:12px; letter-spacing:2px; text-transform:uppercase; padding:12px 22px; margin:4px;">Review on Google</a>
                <a href="${yelpUrl}" style="display:inline-block; background:#c2274b; color:#fff; text-decoration:none; font-size:12px; letter-spacing:2px; text-transform:uppercase; padding:12px 22px; margin:4px;">Review on Yelp</a>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 8px; color: #767182; font-size: 13px;">
            Or use <a href="${reviewUrl}" style="color:#c2274b;">this page</a> to pick either one.
          </p>
          <p style="margin: 12px 0 0; font-size: 13px; color: #767182;">
            Had an issue? Reply to this email or call (818) 662-5665 — we&#39;d rather hear about
            it first so we can make it right.
          </p>
        `,
        signoff: "— The Look Hair Salon",
        includePolicyFooter: false,
      }),
    });
  } catch (error) {
    console.error("Failed to send review request email:", error);
  }
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
      <td style="padding: 14px 0; border-bottom: 1px solid #ebe6dd;">
        <div style="font-size: 11px; color: #c9a96e; letter-spacing: 2px; text-transform: uppercase;">${r.source} · ${r.rating}★ · ${r.relative}</div>
        <div style="font-weight: bold; color: #282936; margin-top: 4px;">${r.author}</div>
        <div style="color: #555; margin-top: 6px; font-size: 14px; line-height: 1.55;">${r.text.replace(/</g, "&lt;")}</div>
        ${r.url ? `<a href="${r.url}" style="color: #c2274b; font-size: 12px; margin-top: 8px; display: inline-block;">Respond on ${r.source} →</a>` : ""}
      </td>
    </tr>`;

  try {
    await getResend().emails.send({
      from: FROM,
      to: SALON_EMAIL,
      subject: `${items.length} new review${items.length === 1 ? "" : "s"} this week`,
      html: brandedEmail({
        preheader: `${items.length} new review${items.length === 1 ? "" : "s"} this week.`,
        kicker: "Weekly review digest",
        headline: `${items.length} new review${items.length === 1 ? "" : "s"}`,
        bodyHtml: `
          <p style="margin: 0 0 12px; color: #767182;">
            Current ratings: ${ratingSnapshot.google ? `Google ${ratingSnapshot.google}★` : ""}${ratingSnapshot.google && ratingSnapshot.yelp ? " · " : ""}${ratingSnapshot.yelp ? `Yelp ${ratingSnapshot.yelp}★` : ""}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">${items.map(row).join("")}</table>
        `,
        signoff: "Auto-sent by The Look review digest",
        includeSupportFooter: false,
        includePolicyFooter: false,
      }),
    });
  } catch (error) {
    console.error("Failed to send review digest email:", error);
  }
}

// ----------------------------------------------------------------------
// Cancellation fee receipt (Phase 2 hookup)
// ----------------------------------------------------------------------

interface CancellationFeeReceipt {
  clientName: string;
  clientEmail: string;
  amountCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
  serviceName: string;
  date: string;
  startTime: string;
  reason: string;
}

export async function sendCancellationFeeReceipt(r: CancellationFeeReceipt) {
  const amount = `$${(r.amountCents / 100).toFixed(2)}`;
  const cardLine = r.cardBrand && r.cardLast4
    ? `${r.cardBrand.toUpperCase()} ending in ${r.cardLast4}`
    : "card on file";
  try {
    await getResend().emails.send({
      from: FROM,
      to: r.clientEmail,
      subject: `Cancellation fee charged — ${amount}`,
      html: brandedEmail({
        preheader: `${amount} was charged to your ${cardLine}.`,
        kicker: "Cancellation fee receipt",
        headline: `${amount} charged to your ${cardLine}.`,
        bodyHtml: `
          <p style="margin: 0 0 14px;">Hi ${r.clientName},</p>
          <p style="margin: 0 0 14px;">
            Per the cancellation policy you agreed to at booking, we charged a cancellation fee
            for the following missed appointment:
          </p>
          ${detailsTable([
            ["Service", r.serviceName],
            ["Date", formatDate(r.date)],
            ["Time", formatTime(r.startTime)],
            ["Reason", r.reason],
            ["Amount", `<strong style="color:#282936;">${amount}</strong>`],
            ["Card", cardLine],
          ])}
          <p style="margin: 18px 0 0; font-size: 13px; color: #767182;">
            Questions about this charge? Reply to this email or call (818) 662-5665 and
            we&#39;ll review it with you. We&#39;d rather have you back in the chair than charge
            a fee — hope to see you again soon.
          </p>
        `,
        signoff: "— The Look Hair Salon",
      }),
    });
  } catch (error) {
    console.error("Failed to send cancellation fee receipt:", error);
  }
}
