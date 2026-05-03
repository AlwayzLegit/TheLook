"use client";

import TurnstileField from "@/components/TurnstileField";
import { useBranding } from "@/components/BrandingProvider";

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  notes: string;
  smsConsent: boolean;
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
  const brand = useBranding();
  const depositDollars = Math.round(depositAmountCents / 100);
  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Your Information</h2>
      <p className="text-navy/70 font-body text-sm text-center mb-8">
        Tell us how to reach you
      </p>

      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <label htmlFor="book-name" className="block text-sm text-navy/70 mb-2 font-body">
            Full Name *
          </label>
          <input
            id="book-name"
            type="text"
            required
            autoComplete="name"
            value={info.name}
            onChange={(e) => onChange({ ...info, name: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
        </div>
        <div>
          <label htmlFor="book-email" className="block text-sm text-navy/70 mb-2 font-body">
            Email *
          </label>
          <input
            id="book-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={info.email}
            onChange={(e) => onChange({ ...info, email: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
        </div>
        <div>
          <label htmlFor="book-phone" className="block text-sm text-navy/70 mb-2 font-body">
            Phone *
          </label>
          <input
            id="book-phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            aria-describedby="book-phone-hint"
            value={info.phone}
            onChange={(e) => onChange({ ...info, phone: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
          <p id="book-phone-hint" className="text-xs text-navy/70 font-body mt-1">
            Required so we can reach you about same-day changes.
          </p>
        </div>

        {/* A2P 10DLC compliance — explicit SMS consent, unchecked by default. */}
        <div>
          <label htmlFor="book-sms-consent" className="flex items-start gap-3 cursor-pointer">
            <input
              id="book-sms-consent"
              type="checkbox"
              checked={info.smsConsent}
              onChange={(e) => onChange({ ...info, smsConsent: e.target.checked })}
              className="mt-1 h-4 w-4 accent-rose shrink-0"
            />
            <span className="text-xs text-navy/70 font-body leading-relaxed">
              By checking this box, I agree to receive SMS text messages from The Look Hair Salon.
              Message frequency varies. Message and data rates may apply.
            </span>
          </label>
          <p className="text-xs text-navy/70 font-body mt-2 ml-7">
            For more information, please review our{" "}
            <a href="/privacy" className="underline hover:text-rose" target="_blank" rel="noreferrer">Privacy Policy</a>
            {" "}and{" "}
            <a href="/terms" className="underline hover:text-rose" target="_blank" rel="noreferrer">Terms of Service</a>.
          </p>
        </div>
        <div>
          <label htmlFor="book-notes" className="block text-sm text-navy/70 mb-2 font-body">
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
                <p className="font-bold text-navy mb-2">Deposit & Cancellation Policy</p>
                <p className="text-xs leading-relaxed">
                  A <strong>${depositDollars} deposit</strong> is charged now to secure this
                  appointment. The deposit is <strong>applied toward your total</strong> at
                  the time of service. If you need to cancel, please give us{" "}
                  <strong>at least 24 hours&apos; notice</strong> to receive a refund —
                  cancellations within 24&nbsp;hours (and no-shows) forfeit the deposit.
                  Additional cancellation or no-show fees may apply where applicable.
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
                  I agree to the <strong>deposit & cancellation policy</strong> above and
                  authorize {brand.name} to charge the ${depositDollars} deposit now. *
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
