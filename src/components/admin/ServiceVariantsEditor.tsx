"use client";

import { useEffect, useState } from "react";
import { parseDollarsToCents } from "@/lib/priceText";

interface Variant {
  id?: string;
  name: string;
  price_text: string;
  price_min: number;
  duration: number;
  active?: boolean;
  sort_order?: number;
}

interface Props {
  serviceId: string;
  onToast?: (type: "success" | "error", message: string) => void;
}

// Inline editor for service variants. Used for services like
// "Facial Hair Removal" that need per-area pricing (brow / lip / chin / etc).
// Admins click Save to replace the entire variant set for the service.
export default function ServiceVariantsEditor({ serviceId, onToast }: Props) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/services/${serviceId}/variants`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setVariants(data.map((v: any) => ({
            id: v.id,
            name: v.name,
            price_text: v.price_text,
            price_min: v.price_min,
            duration: v.duration,
            active: v.active,
            sort_order: v.sort_order,
          })));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [serviceId]);

  const addRow = () => {
    setVariants((prev) => [
      ...prev,
      { name: "", price_text: "$15", price_min: 1500, duration: 10, active: true, sort_order: prev.length },
    ]);
  };

  const updateRow = (idx: number, field: keyof Variant, value: string | number | boolean) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        const next = { ...v, [field]: value };
        // Whenever price_text changes, derive price_min so the two
        // can't drift. Owners edit the visible "$25" string; the
        // cents field becomes a derived display, not a separate
        // truth. Server applies the same derivation as a safety net.
        if (field === "price_text" && typeof value === "string") {
          const cents = parseDollarsToCents(value);
          if (cents !== null) next.price_min = cents;
        }
        return next;
      }),
    );
  };

  const removeRow = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = variants.map((v, i) => ({
        name: v.name.trim(),
        price_text: v.price_text.trim(),
        price_min: Number(v.price_min) || 0,
        duration: Number(v.duration) || 1,
        active: v.active ?? true,
        sort_order: i,
      }));
      const res = await fetch(`/api/admin/services/${serviceId}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onToast?.("error", data.error || "Failed to save variants.");
        return;
      }
      onToast?.("success", `Saved ${payload.length} variant${payload.length === 1 ? "" : "s"}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-navy/10 bg-cream/40 p-4 mt-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-heading text-sm">Variants / areas</p>
          <p className="text-navy/50 text-xs font-body">
            Add one row per option (e.g. Brow / Lip / Chin / Full Face). When variants
            exist, customers pick an area in the booking flow.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="shrink-0 text-xs font-body border border-navy/20 px-3 py-1.5 hover:bg-navy/5"
        >
          + Add row
        </button>
      </div>

      {loading ? (
        <p className="text-navy/40 text-xs font-body">Loading variants...</p>
      ) : variants.length === 0 ? (
        <p className="text-navy/40 text-xs font-body py-2">
          No variants yet — this service is offered as a single flat option.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                placeholder="Name (e.g. Brow)"
                value={v.name}
                onChange={(e) => updateRow(i, "name", e.target.value)}
                className="col-span-4 border border-navy/20 px-2 py-1.5 text-sm font-body"
              />
              <input
                type="text"
                placeholder="$15"
                value={v.price_text}
                onChange={(e) => updateRow(i, "price_text", e.target.value)}
                className="col-span-2 border border-navy/20 px-2 py-1.5 text-sm font-body"
                title="Customer-facing price (e.g. $25, $5+, from $15). Cents are derived automatically."
              />
              <input
                type="number"
                placeholder="cents"
                value={v.price_min}
                onChange={(e) => updateRow(i, "price_min", parseInt(e.target.value, 10) || 0)}
                className="col-span-2 border border-navy/20 px-2 py-1.5 text-sm font-body bg-navy/5 text-navy/70"
                min={0}
                step={100}
                title="Cents — auto-derived from the price text. Override only if the visible price doesn't have a number (e.g. 'Free')."
              />
              <input
                type="number"
                placeholder="min"
                value={v.duration}
                onChange={(e) => updateRow(i, "duration", parseInt(e.target.value, 10) || 1)}
                className="col-span-2 border border-navy/20 px-2 py-1.5 text-sm font-body"
                min={1}
              />
              <label className="col-span-1 flex items-center justify-center cursor-pointer" title="Active">
                <input
                  type="checkbox"
                  checked={v.active ?? true}
                  onChange={(e) => updateRow(i, "active", e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="col-span-1 text-red-500 text-xs font-body hover:underline"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-navy text-white text-xs font-body uppercase tracking-widest px-4 py-2 hover:bg-navy/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save variants"}
        </button>
        <p className="text-navy/40 text-[10px] font-body">
          Columns: Name · Display price · Price (cents) · Duration (min) · Active · Remove
        </p>
      </div>
    </div>
  );
}
