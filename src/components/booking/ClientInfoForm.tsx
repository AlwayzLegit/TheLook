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

        {/* Policy disclaimer — only shown when the booking triggers the
            deposit. Short bookings (<= $100) skip card collection and
            therefore don't need the forfeit language. */}
        <div className="space-y-3">
          {requiresDeposit ? (
            <>
              <div className="bg-cream/50 border border-navy/10 p-4 text-sm font-body text-navy/70">
                <p className="font-bold text-navy mb-2">Deposit Policy</p>
                <p className="text-xs leading-relaxed">
                  A <strong>${depositDollars} deposit</strong> is charged upon booking to
                  secure your appointment. The deposit is{" "}
                  <strong>applied to your service total</strong> at the appointment. If you
                  no-show or cancel within 24&nbsp;hours of your appointment, the deposit is
                  <strong> forfeited</strong>.
                </p>
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(e) => onPolicyChange(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                  required
                />
                <span className="text-xs text-navy/70">
                  I agree to the <strong>deposit policy</strong> above and authorize The Look
                  Hair Salon to charge the ${depositDollars} deposit now. I understand the
                  deposit is forfeited if I no-show or cancel within 24&nbsp;hours. *
                </span>
              </label>
            </>
          ) : (
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => onPolicyChange(e.target.checked)}
                className="w-4 h-4 mt-0.5"
                required
              />
              <span className="text-xs text-navy/70">
                I confirm the information above is accurate and understand that my appointment
                is only held once confirmed by the salon. *
              </span>
            </label>
          )}
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
