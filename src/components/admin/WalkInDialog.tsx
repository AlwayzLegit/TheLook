"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";
import { formatDuration } from "@/lib/format";

// Fast-path walk-in creator. Separate from NewAppointmentSheet because
// walk-ins bypass availability rules, deposits, and reminders — the
// customer is at the counter, so Anna wants a 10-second intake with
// minimal fields. Three inputs (stylist, service, optional name) and
// a big Save button.

interface StylistOpt {
  id: string;
  name: string;
}
interface ServiceOpt {
  id: string;
  name: string;
  duration: number;
  category: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export default function WalkInDialog({ open, onClose, onCreated }: Props) {
  const [stylists, setStylists] = useState<StylistOpt[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [stylistId, setStylistId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/stylists").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/services").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([sty, svc]) => {
        if (cancelled) return;
        const activeStylists = (Array.isArray(sty) ? sty : []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.active !== false && (s.name || "").trim().toLowerCase() !== "any stylist",
        );
        const activeServices = (Array.isArray(svc) ? svc : []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.active !== false,
        );
        setStylists(activeStylists);
        setServices(activeServices);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load stylists or services.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setStylistId("");
      setServiceIds([]);
      setClientName("");
      setClientPhone("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  const totalDuration = useMemo(
    () => services.filter((s) => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.duration, 0),
    [services, serviceIds],
  );

  const toggleService = (id: string) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    setError(null);
    if (!stylistId) {
      setError("Pick a stylist.");
      return;
    }
    if (serviceIds.length === 0) {
      setError("Pick at least one service.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/appointments/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stylistId,
          serviceIds,
          clientName: clientName.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create walk-in.");
        return;
      }
      toast.success("Walk-in added", {
        description: `${clientName.trim() || "Walk-in"} · starts now`,
      });
      onCreated?.(data.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceOpt[]>();
    for (const s of services) {
      const key = s.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [services]);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => (v ? null : onClose())}
      title="Add walk-in"
      description="Quick add for a customer who's here now. Skips availability + deposit checks — lands as confirmed, starting now."
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Add walk-in"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Stylist *"
          value={stylistId}
          onChange={(e) => setStylistId(e.target.value)}
        >
          <option value="">— Select stylist —</option>
          {stylists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <div>
          <label className="block text-[0.8125rem] text-[var(--color-text)] mb-1.5">Services *</label>
          <div className="border border-[var(--color-border)] rounded-md bg-white max-h-64 overflow-y-auto">
            {grouped.map(([cat, rows]) => (
              <div key={cat}>
                <p className="text-[0.6875rem] tracking-widest uppercase text-[var(--color-text-subtle)] bg-[var(--color-cream-50)] px-3 py-1.5 border-t border-[var(--color-border)] first:border-t-0">
                  {cat}
                </p>
                {rows.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 border-t border-[var(--color-border)] text-sm hover:bg-[var(--color-cream-50)] cursor-pointer first:border-t-0"
                  >
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                    />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-[0.75rem] text-[var(--color-text-muted)]">
                      {formatDuration(s.duration)}
                    </span>
                  </label>
                ))}
              </div>
            ))}
            {services.length === 0 && (
              <p className="px-3 py-4 text-sm text-[var(--color-text-muted)]">No services loaded yet.</p>
            )}
          </div>
          {totalDuration > 0 && (
            <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-1">
              Total: {formatDuration(totalDuration)}
            </p>
          )}
        </div>

        <Input
          label="Client name (optional)"
          placeholder="Walk-in"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
        <Input
          label="Phone (optional)"
          placeholder="For follow-up later"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          type="tel"
          inputMode="tel"
        />
        <Input
          label="Staff note (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && (
          <p role="alert" aria-live="polite" className="text-red-600 text-sm font-body">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
