/**
 * Shared branded email layout. Every customer- and staff-facing email
 * renders through this so tone, typography, header/footer, and
 * contact/policy blocks stay consistent.
 *
 * Usage:
 *   const html = brandedEmail({
 *     preheader: "Your Balayage is confirmed for Mon May 4 at 2 PM.",
 *     headline: "We can't wait to see you",
 *     bodyHtml: "<p>…</p>",
 *     ctaLabel: "Manage booking",
 *     ctaUrl: "https://...",
 *     signoff: "— The Look team",
 *     includeSupportFooter: true,
 *     includePolicyFooter: true,
 *   });
 *
 * All styling is inlined — most email clients strip external CSS.
 */

// Branding values consumed in the footer / header / signoff. The caller
// (email.ts) passes live values from getBranding(); falling back to the
// defaults below keeps the template renderable in tests or if upstream
// forgets to pass brand.
export interface EmailBrand {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface BrandedEmailArgs {
  // One-line summary that previews in Gmail / Apple Mail. Keep ≤90 chars.
  preheader: string;
  // Accent text above the main H1 (e.g. "APPOINTMENT CONFIRMED"). Small caps.
  kicker?: string;
  // Main headline. Short; we wrap in the brand serif.
  headline: string;
  // Raw HTML body content. Keep paragraphs / tables simple; avoid block CSS.
  bodyHtml: string;
  // Optional CTA button.
  ctaLabel?: string;
  ctaUrl?: string;
  // A secondary CTA (e.g. "Cancel" beside the primary "Reschedule").
  secondaryLabel?: string;
  secondaryUrl?: string;
  // Signed-by line at the end of the body. Defaults to "— <brand.name> team".
  signoff?: string;
  // Include the "address / phone / hours" block above the final footer.
  includeSupportFooter?: boolean;
  // Include the deposit + cancellation policy recap at the very bottom.
  includePolicyFooter?: boolean;
  // Live salon identity. Falls back to the hardcoded defaults when missing.
  brand?: EmailBrand;
}

const BRAND_DEFAULTS = {
  name: "The Look Hair Salon",
  address: "919 South Central Ave Suite #E, Glendale, CA 91204",
  phone: "(818) 662-5665",
  email: "thelook_hairsalon@yahoo.com",
};

const BRAND_STATIC = {
  website: "https://www.thelookhairsalonla.com",
  bookUrl: "https://www.thelookhairsalonla.com/book",
  hoursSummary: "Mon, Wed–Fri 10am–6pm · Sat 10am–6pm · Sun 10am–5pm · Tue closed",
  colors: {
    bg: "#faf8f5",
    card: "#ffffff",
    navy: "#282936",
    gold: "#c9a96e",
    rose: "#c2274b",
    border: "#ebe6dd",
    mute: "#767182",
    softMute: "#a8a3b4",
  },
};

// Keep the phone-href normalization inline so emailTemplate.ts stays a
// dependency-free rendering primitive (no @/lib/branding import loop).
function phoneToTelHref(phone: string): string {
  const hadPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (hadPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits;
}

export function brandedEmail(args: BrandedEmailArgs): string {
  const {
    preheader,
    kicker,
    headline,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    secondaryLabel,
    secondaryUrl,
    includeSupportFooter = true,
    includePolicyFooter = true,
    brand: brandOverride,
  } = args;

  const brand = { ...BRAND_DEFAULTS, ...(brandOverride || {}) };
  const phoneHref = phoneToTelHref(brand.phone);
  const signoff = args.signoff ?? `— The ${brand.name} team`;

  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr>
         <td style="padding: 24px 0 8px; text-align: center;">
           <a href="${ctaUrl}" style="display: inline-block; background: ${BRAND_STATIC.colors.rose}; color: #fff; text-decoration: none; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; padding: 14px 28px; border-radius: 2px;">
             ${ctaLabel}
           </a>
         </td>
       </tr>
       ${secondaryLabel && secondaryUrl ? `
       <tr>
         <td style="padding: 6px 0 0; text-align: center;">
           <a href="${secondaryUrl}" style="color: ${BRAND_STATIC.colors.mute}; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; text-decoration: underline;">
             ${secondaryLabel}
           </a>
         </td>
       </tr>` : ""}`
    : "";

  const supportBlock = includeSupportFooter ? `
    <tr>
      <td style="padding: 28px 28px 0; border-top: 1px solid ${BRAND_STATIC.colors.border};">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: ${BRAND_STATIC.colors.mute}; line-height: 1.55;">
          <tr>
            <td style="padding-bottom: 8px;">
              <strong style="color: ${BRAND_STATIC.colors.navy};">Need help?</strong>
              Call or text <a href="tel:${phoneHref}" style="color: ${BRAND_STATIC.colors.rose}; text-decoration: none;">${brand.phone}</a>
              or reply to this email.
            </td>
          </tr>
          <tr>
            <td style="padding: 2px 0;">
              <a href="${BRAND_STATIC.website}" style="color: ${BRAND_STATIC.colors.navy}; text-decoration: none;">${brand.address}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 2px 0; color: ${BRAND_STATIC.colors.softMute}; font-size: 12px;">
              ${BRAND_STATIC.hoursSummary}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : "";

  const policyFooter = includePolicyFooter ? `
    <tr>
      <td style="padding: 20px 28px 28px; color: ${BRAND_STATIC.colors.softMute}; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.55;">
        <p style="margin: 0 0 6px;">
          <strong style="color: ${BRAND_STATIC.colors.mute};">Deposit &amp; cancellation policy.</strong>
          Your deposit is applied toward your service total at the appointment. Refundable if
          cancelled at least 24 hours in advance; cancellations within 24 hours (and no-shows)
          forfeit the deposit. Additional cancellation or no-show fees may apply where applicable.
        </p>
      </td>
    </tr>` : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin: 0; padding: 0; background: ${BRAND_STATIC.colors.bg};">
  <div style="display:none; font-size:1px; color:${BRAND_STATIC.colors.bg}; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND_STATIC.colors.bg}; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: ${BRAND_STATIC.colors.card}; border: 1px solid ${BRAND_STATIC.colors.border};">

          <!-- Brand header -->
          <tr>
            <td style="padding: 32px 28px 24px; text-align: center; border-bottom: 1px solid ${BRAND_STATIC.colors.border};">
              <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; letter-spacing: 1px; color: ${BRAND_STATIC.colors.navy};">
                ${escapeHtml(brand.name.toUpperCase())}
              </p>
              <p style="margin: 8px 0 0; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; letter-spacing: 3px; color: ${BRAND_STATIC.colors.gold}; text-transform: uppercase;">
                Glendale, CA · Est. 2011
              </p>
            </td>
          </tr>

          ${kicker ? `
          <tr>
            <td style="padding: 24px 28px 0; text-align: center;">
              <p style="margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; letter-spacing: 3px; color: ${BRAND_STATIC.colors.rose}; text-transform: uppercase;">
                ${escapeHtml(kicker)}
              </p>
            </td>
          </tr>` : ""}

          <!-- Headline -->
          <tr>
            <td style="padding: ${kicker ? "10px" : "24px"} 28px 8px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.25; color: ${BRAND_STATIC.colors.navy}; font-weight: normal;">
                ${escapeHtml(headline)}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 16px 28px 4px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #444; ">
              ${bodyHtml}
            </td>
          </tr>

          ${ctaBlock}

          <tr>
            <td style="padding: 24px 28px 4px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: ${BRAND_STATIC.colors.mute};">
              ${escapeHtml(signoff)}
            </td>
          </tr>

          ${supportBlock}
          ${policyFooter}

        </table>
        <p style="margin: 16px 0 0; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: ${BRAND_STATIC.colors.softMute};">
          © ${new Date().getFullYear()} ${escapeHtml(brand.name)}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Renders an appointment details block as a simple 2-col table. Re-used
// across confirmation, reminder, status-change, cancellation-fee emails.
export function detailsTable(rows: Array<[string, string]>): string {
  const tds = rows.map(([k, v]) => `
    <tr>
      <td style="padding: 8px 0; width: 120px; color: #999; font-size: 13px;">${escapeHtml(k)}</td>
      <td style="padding: 8px 0; color: #282936; font-weight: 600; font-size: 14px;">${v /* already sanitized / trusted */}</td>
    </tr>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #ebe6dd; margin-top: 4px;">${tds}</table>`;
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}
