"use client";

import TurnstileField from "@/components/TurnstileField";

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

interface Props {
  info: ClientInfo;
  onChange: (info: ClientInfo) => void;
  turnstileSiteKey?: string;
  onTurnstileChange?: (token: string | null) => void;
  policyAccepted: boolean;
  onPolicyChange: (v: boolean) => void;
  // True when the booking is long enough to trigger the $50 deposit. Drives
  // which policy card + which consent line we show — short bookings get the
  // cancellation-only language since no deposit is charged.
  requiresDeposit: boolean;
  depositAmountCents: number;
}

export default function ClientInfoForm({
  info,
  onChange,
  turnstileSiteKey,
  onTurnstileChange,
  policyAccepted,
  onPolicyChange,
  requiresDeposit,
  depositAmountCents,
}: Props) {
  const depositDollars = Math.round(depositAmountCents / 100);
  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Your Information</h2>
      <p className="text-navy/50 font-body text-sm text-center mb-8">
        Tell us how to reach you
      </p>

      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <label htmlFor="book-name" className="block text-sm text-navy/60 mb-2 font-body">
            Full Name *
          </label>
          <input
            id="book-name"
            type="text"
            required
            value={info.name}
            onChange={(e) => onChange({ ...info, name: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
        </div>
        <div>
          <label htmlFor="book-email" className="block text-sm text-navy/60 mb-2 font-body">
            Email *
          </label>
          <input
            id="book-email"
            type="email"
            required
            value={info.email}
            onChange={(e) => onChange({ ...info, email: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
        </div>
        <div>
          <label htmlFor="book-phone" className="block text-sm text-navy/60 mb-2 font-body">
            Phone *
          </label>
          <input
            id="book-phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={info.phone}
            onChange={(e) => onChange({ ...info, phone: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
          <p className="text-xs text-navy/40 font-body mt-1">
            Required so we can reach you about same-day changes.
          </p>
        </div>
        <div>
          <label htmlFor="book-notes" className="block text-sm text-navy/60 mb-2 font-body">
            Notes (optional)
          </label>
          <textarea
            id="book-notes"
            rows={3}
            value={info.notes}
            onChange={(e) => onChange({ ...info, notes: e.target.value })}
            placeholder="Any special requests or details about what you're looking for..."
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors resize-none"
          />
        </div>

        {/* Policy disclaimers — depending on whether the booking triggers the
            deposit, show either the deposit + cancellation pair OR a card-on-
            file-only card. The consent line below mirrors. */}
        <div className="space-y-3">
          {requiresDeposit ? (
            <>
              <div className="bg-cream/50 border border-navy/10 p-4 text-sm font-body text-navy/70">
                <p className="font-bold text-navy mb-2">Deposit Policy</p>
                <p className="text-xs leading-relaxed">
                  You will be charged a <strong>${depositDollars} deposit</strong> upon booking
                  your appointment. The deposit is <strong>non-refundable</strong>. The amount of
                  your deposit will be applied to the cost of your service at the time of your
                  appointment. If you need to cancel, you will lose your deposit.
                </p>
              </div>

              <div className="bg-rose/5 border border-rose/30 p-4 text-sm font-body text-navy/70">
                <p className="font-bold text-navy mb-2">Cancellation Policy</p>
                <p className="text-xs leading-relaxed">
                  A <strong>25% cancellation fee</strong> (calculated on the total appointment
                  value) will be charged on no-shows or cancellations within 24&nbsp;hours of the
                  scheduled appointment. The fee is charged automatically to the card on file.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-cream/50 border border-navy/10 p-4 text-sm font-body text-navy/70">
                <p className="font-bold text-navy mb-2">Card on file</p>
                <p className="text-xs leading-relaxed">
                  No deposit is charged for this booking. We&apos;ll save your card on file
                  securely with Stripe so the salon can charge the 25% cancellation fee if
                  you no-show or cancel within 24&nbsp;hours of your appointment.
                </p>
              </div>

              <div className="bg-rose/5 border border-rose/30 p-4 text-sm font-body text-navy/70">
                <p className="font-bold text-navy mb-2">Cancellation Policy</p>
                <p className="text-xs leading-relaxed">
                  A <strong>25% cancellation fee</strong> (calculated on the total appointment
                  value) will be charged on no-shows or cancellations within 24&nbsp;hours of the
                  scheduled appointment. The fee is charged automatically to the card on file.
                </p>
              </div>
            </>
          )}

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={policyAccepted}
              onChange={(e) => onPolicyChange(e.target.checked)}
              className="w-4 h-4 mt-0.5"
              required
            />
            <span className="text-xs text-navy/70">
              {requiresDeposit ? (
                <>
                  I have read and agree to the <strong>deposit policy</strong> and the{" "}
                  <strong>cancellation policy</strong> above. I authorize The Look Hair Salon to
                  save my card on file and charge the 25% cancellation fee if I no-show or
                  cancel within 24&nbsp;hours of my appointment. *
                </>
              ) : (
                <>
                  I have read and agree to the <strong>cancellation policy</strong> above. I
                  authorize The Look Hair Salon to save my card on file and charge the 25%
                  cancellation fee if I no-show or cancel within 24&nbsp;hours of my
                  appointment. *
                </>
              )}
            </span>
          </label>
        </div>

        {turnstileSiteKey && onTurnstileChange ? (
          <div className="pt-2">
            <TurnstileField
              siteKey={turnstileSiteKey}
              onTokenChange={onTurnstileChange}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
