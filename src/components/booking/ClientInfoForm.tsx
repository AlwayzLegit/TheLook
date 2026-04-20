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
}

export default function ClientInfoForm({
  info,
  onChange,
  turnstileSiteKey,
  onTurnstileChange,
  policyAccepted,
  onPolicyChange,
}: Props) {
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

        {/* Two separate policy cards so customers clearly see the deposit
            rule AND the 25% cancellation fee before agreeing. */}
        <div className="space-y-3">
          <div className="bg-cream/50 border border-navy/10 p-4 text-sm font-body text-navy/70">
            <p className="font-bold text-navy mb-2">Deposit Policy</p>
            <p className="text-xs leading-relaxed">
              You will be charged a <strong>$50 deposit</strong> upon booking your appointment.
              The deposit is <strong>non-refundable</strong>. The amount of your deposit will be
              applied to the cost of your service at the time of your appointment. If you need
              to cancel, you will lose your deposit.
            </p>
          </div>

          <div className="bg-rose/5 border border-rose/30 p-4 text-sm font-body text-navy/70">
            <p className="font-bold text-navy mb-2">Cancellation Policy</p>
            <p className="text-xs leading-relaxed">
              A <strong>25% cancellation fee</strong> will be charged on no-shows or
              cancellations within 24&nbsp;hours of the scheduled appointment.
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
              I have read and agree to the <strong>deposit policy</strong> and the{" "}
              <strong>cancellation policy</strong> above. *
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
