"use client";

import { useEffect, useState } from "react";

interface Props {
  appointmentId: string | null;
  clientName: string;
  // "VISA •••4242" style label when a card is on file — purely informational.
  cardLabel?: string | null;
  onClose: () => void;
  onCharged?: () => void;
}

type ChargeReason = "no_show" | "late_cancel" | "other";

function reasonLabel(r: ChargeReason): string {
  switch (r) {
    case "no_show":
      return "No-show";
    case "late_cancel":
      return "Late cancellation";
    default:
      return "Other";
  }
}

// POSTs to /api/admin/appointments/[id]/charge-fee. Defaults to the
// standard no-show fee (25% of the appointment's service total, computed
// server-side). The operator can switch to a custom dollar amount for a
// reduced courtesy fee. Mirrors RefundDialog's structure/!styling so the
// two money actions feel like one family.
export default function ChargeCardDialog({
  appointmentId,
  clientName,
  cardLabel,
  onClose,
  onCharged,
}: Props) {
  const [mode, setMode] = useState<"standard" | "custom">("standard");
  const [amountStr, setAmountStr] = useState("");
  const [reason, setReason] = useState<ChargeReason>("no_show");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { kind: "charged"; amountCents: number; card: string | null }
    | { kind: "requires_action"; message: string }
    | null
  >(null);

  useEffect(() => {
    if (!appointmentId) return;
    setMode("standard");
    setAmountStr("");
    setReason("no_show");
    setError(null);
    setResult(null);
  }, [appointmentId]);

  if (!appointmentId) return null;

  const submit = async () => {
    setError(null);
    const body: { percent?: number; amountCents?: number; reason: string } = {
      reason: reasonLabel(reason),
    };
    if (mode === "custom") {
      const dollars = Number(amountStr);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        setError("Enter a positive dollar amount.");
        return;
      }
      body.amountCents = Math.round(dollars * 100);
    } else {
      body.percent = 25;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/charge-fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Charge failed.");
        return;
      }
      if (data.status === "requires_action") {
        setResult({
          kind: "requires_action",
          message:
            data.message ||
            "The client's bank requires authentication (3D Secure). Email them the completion link.",
        });
        return;
      }
      setResult({
        kind: "charged",
        amountCents: data.amountCharged,
        card:
          data.cardBrand && data.cardLast4
            ? `${String(data.cardBrand).toUpperCase()} •••${data.cardLast4}`
            : null,
      });
      onCharged?.();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Charge card on file"
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm sm:rounded-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-navy/10">
          <h3 className="font-heading text-lg">Charge card on file</h3>
          <p className="text-xs font-body text-navy/60 mt-0.5">
            For {clientName}
            {cardLabel ? ` · ${cardLabel}` : ""}. Standard no-show fee is 25% of the
            service total. The client is emailed a receipt automatically.
          </p>
        </div>

        {result ? (
          <div className="px-5 py-5 space-y-3">
            {result.kind === "charged" ? (
              <div className="bg-green-50 border border-green-200 p-3 text-sm font-body text-green-800">
                Charged ${(result.amountCents / 100).toFixed(2)}
                {result.card ? ` to ${result.card}` : ""}. Receipt sent.
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-3 text-sm font-body text-amber-800">
                {result.message}
              </div>
            )}
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("standard")}
                className={`flex-1 text-xs font-body px-3 py-2 border ${
                  mode === "standard"
                    ? "border-navy bg-navy text-white"
                    : "border-navy/20 text-navy/70 hover:bg-navy/5"
                }`}
              >
                No-show fee (25%)
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`flex-1 text-xs font-body px-3 py-2 border ${
                  mode === "custom"
                    ? "border-navy bg-navy text-white"
                    : "border-navy/20 text-navy/70 hover:bg-navy/5"
                }`}
              >
                Custom amount
              </button>
            </div>

            {mode === "custom" && (
              <div>
                <label className="block text-xs font-body text-navy/70 mb-1">
                  Amount to charge
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
                    placeholder="0.00"
                    className="flex-1 py-1.5 px-1 text-sm font-body focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-body text-navy/70 mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ChargeReason)}
                className="w-full border border-navy/20 px-2 py-1.5 text-sm font-body bg-white"
              >
                <option value="no_show">No-show</option>
                <option value="late_cancel">Late cancellation</option>
                <option value="other">Other</option>
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
                {pending ? "Charging…" : "Charge card"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
