"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";

type Preset = "30" | "60" | "90" | "custom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  endpoint: string; // POST target
  onCleared?: () => void;
}

// Generic "Clear history" modal shared by /admin/activity and the
// archived-appointments tab. Preset picker + custom range + confirm
// step; the endpoint is expected to return { removed: number }.
export default function ClearHistoryModal({
  open,
  onOpenChange,
  title,
  description,
  endpoint,
  onCleared,
}: Props) {
  const [preset, setPreset] = useState<Preset>("90");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPreset("90");
    setFrom("");
    setTo("");
    setStep("pick");
    setSubmitting(false);
  };

  const humanRange = (): string => {
    if (preset !== "custom") return `Older than ${preset} days`;
    if (from && to) return `Between ${from} and ${to}`;
    if (from) return `From ${from} onward`;
    if (to) return `Up to ${to}`;
    return "Custom (no dates set)";
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const body = preset === "custom"
        ? { preset: "custom", from: from || undefined, to: to || undefined }
        : { preset };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Cleared ${data.removed ?? 0} row${data.removed === 1 ? "" : "s"}.`);
        onOpenChange(false);
        reset();
        onCleared?.();
      } else {
        toast.error(data.error || "Clear failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title={title}
      description={description}
    >
      {step === "pick" ? (
        <>
          <div className="space-y-3">
            <p className="text-[0.8125rem] text-[var(--color-text-muted)]">
              Pick which rows to remove. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["30", "60", "90", "custom"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={
                    "px-3 py-2.5 text-[0.8125rem] rounded-md border transition-colors " +
                    (preset === p
                      ? "border-[var(--color-crimson-600)] bg-[var(--color-crimson-600)]/8 text-[var(--color-text)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-muted)]")
                  }
                >
                  {p === "custom" ? "Custom range…" : `Older than ${p} days`}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setStep("confirm")}
              disabled={preset === "custom" && !from && !to}
            >
              Continue →
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <p className="text-[0.875rem] text-[var(--color-text)]">
              You&apos;re about to permanently delete rows matching:
            </p>
            <p className="text-[0.875rem] font-medium text-[var(--color-danger)]">{humanRange()}</p>
            <p className="text-[0.75rem] text-[var(--color-text-muted)]">
              A single audit entry will be recorded for this clear so you can see it happened.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="secondary" size="sm" onClick={() => setStep("pick")}>Back</Button>
            <Button variant="danger" size="sm" onClick={submit} loading={submitting}>
              Yes, delete them
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
