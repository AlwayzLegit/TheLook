"use client";

import { useEffect, useState } from "react";

interface Props {
  appointmentId: string | null;
  clientName: string;
  onClose: () => void;
  onRefunded?: () => void;
}

// Small modal that POSTs to /api/admin/appointments/[id]/refund. Defaults
// to a full refund with reason=requested_by_customer; an optional
// dollar-amount field lets the owner do a partial refund (e.g. $20 off
// a declined service) without leaving the appointment modal.
export default function RefundDialog({ appointmentId, clientName, onClose, onRefunded }: Props) {
  const [amountStr, setAmountStr] = useState<string>("");
  const [reason, setReason] = useState<"requested_by_customer" | "duplicate" | "fraudulent">(
    "requested_by_customer",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ amountCents: number; fullyRefunded: boolean } | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    setAmountStr("");
    setReason("requested_by_customer");
    setError(null);
    setResult(null);
  }, [appointmentId]);

  if (!appointmentId) return null;

  const submit = async () => {
    setPending(true);
    setError(null);
    const body: { reason: string; amountCents?: number } = { reason };
    if (amountStr.trim() !== "") {
      const dollars = Number(amountStr);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        setError("Enter a positive dollar amount, or leave blank for a full refund.");
        setPending(false);
        return;
      }
      body.amountCents = Math.round(dollars * 100);
    }
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Refund failed.");
        return;
      }
      setResult({
        amountCents: data.amountCents,
        fullyRefunded: Boolean(data.fullyRefunded),
      });
      onRefunded?.();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Issue refund"
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm sm:rounded-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-navy/10">
          <h3 className="font-heading text-lg">Refund deposit</h3>
          <p className="text-xs font-body text-navy/60 mt-0.5">
            For {clientName}. Charges are reversed via Stripe. Webhook reconciles the
            ledger row automatically.
          </p>
        </div>

        {result ? (
          <div className="px-5 py-5 space-y-3">
            <div className="bg-green-50 border border-green-200 p-3 text-sm font-body text-green-800">
              Refund issued — ${(result.amountCents / 100).toFixed(2)}.{" "}
              {result.fullyRefunded
                ? "Deposit is fully refunded."
                : "Partial refund — remaining balance is still captured."}
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="text-sm font-body px-4 py-2 bg-navy text-white hover:bg-navy/90"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-body text-navy/70 mb-1">
                Amount (optional — blank = full refund)
              </label>
              <div className="flex items-center border border-navy/20">
                <span className="px-2 text-sm font-body text-navy/50">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Full amount"
                  className="flex-1 py-1.5 px-1 text-sm font-body focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-body text-navy/70 mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
                className="w-full border border-navy/20 px-2 py-1.5 text-sm font-body bg-white"
              >
                <option value="requested_by_customer">Requested by customer</option>
                <option value="duplicate">Duplicate charge</option>
                <option value="fraudulent">Fraudulent</option>
              </select>
            </div>
            {error && (
              <p role="alert" aria-live="polite" className="text-red-600 text-xs font-body">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                disabled={pending}
                className="text-sm font-body text-navy/60 px-3 py-2 hover:text-navy disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="text-sm font-body bg-rose text-white px-4 py-2 hover:bg-rose-light disabled:opacity-60"
              >
                {pending ? "Processing…" : "Issue refund"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
