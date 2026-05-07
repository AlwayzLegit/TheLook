"use client";

import { useEffect, useMemo, useState } from "react";

interface Service {
  id: string;
  name: string;
  price_text: string;
  duration: number;
  category: string;
  variants?: Array<{ id: string; name: string; price_text: string; duration: number }>;
}

interface Stylist {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  prefillEmail?: string;
  prefillName?: string;
  prefillPhone?: string;
}

// Small floating dialog for admins to create a booking on behalf of a client.
// Skips captcha / rate-limits (admin endpoint). Lets admins override conflicts
// when they need to squeeze someone in.
export default function NewAppointmentModal({
  open, onClose, onCreated, prefillEmail = "", prefillName = "", prefillPhone = "",
}: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [pickedServiceIds, setPickedServiceIds] = useState<string[]>([]);
  const [pickedVariantBy, setPickedVariantBy] = useState<Record<string, string>>({});
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [clientName, setClientName] = useState(prefillName);
  const [clientEmail, setClientEmail] = useState(prefillEmail);
  const [clientPhone, setClientPhone] = useState(prefillPhone);
  const [notes, setNotes] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [status, setStatus] = useState<"pending" | "confirmed" | "completed">("confirmed");
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientEmail(prefillEmail);
    setClientName(prefillName);
    setClientPhone(prefillPhone);
    setError(null);
  }, [open, prefillEmail, prefillName, prefillPhone]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [sr, yr] = await Promise.all([
          fetch("/api/admin/services").then((r) => r.json()),
          fetch("/api/admin/stylists").then((r) => r.json()),
        ]);
        type SvcApi = { id: string; name: string; price_text: string; duration: number; category: string };
        const baseServices: Service[] = Array.isArray(sr) ? (sr as SvcApi[]).map((s) => ({
          id: s.id,
          name: s.name,
          price_text: s.price_text,
          duration: s.duration,
          category: s.category,
        })) : [];
        // Pull variants for each service (lazy but simple).
        const withVariants = await Promise.all(
          baseServices.map(async (s) => {
            try {
              const vr = await fetch(`/api/admin/services/${s.id}/variants`);
              if (!vr.ok) return s;
              const vdata = await vr.json();
              type VariantApi = { id: string; name: string; price_text: string; duration: number };
              if (Array.isArray(vdata) && vdata.length > 0) s.variants = (vdata as VariantApi[]).map((v) => ({
                id: v.id, name: v.name, price_text: v.price_text, duration: v.duration,
              }));
              return s;
            } catch {
              return s;
            }
          }),
        );
        setServices(withVariants);
        if (Array.isArray(yr)) setStylists(yr.map((x: Stylist) => ({ id: x.id, name: x.name })));
      } catch {
        setError("Failed to load services or stylists.");
      }
    })();
  }, [open]);

  const pickedServices = useMemo(
    () => pickedServiceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as Service[],
    [pickedServiceIds, services],
  );
  const totalDuration = useMemo(() => {
    return pickedServices.reduce((sum, s) => {
      const vid = pickedVariantBy[s.id];
      const v = s.variants?.find((x) => x.id === vid);
      return sum + (v?.duration ?? s.duration);
    }, 0);
  }, [pickedServices, pickedVariantBy]);

  const toggleService = (id: string) => {
    setPickedServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (pickedServiceIds.length === 0 || !stylistId || !date || !startTime || !clientName || !clientEmail) {
      setError("Please fill in every required field.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: pickedServiceIds,
          variantIds: pickedServiceIds.map((id) => pickedVariantBy[id] || ""),
          stylistId,
          date,
          startTime,
          clientName,
          clientEmail,
          clientPhone: clientPhone || null,
          notes: notes || null,
          staffNotes: staffNotes || null,
          status,
          overrideConflicts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create booking.");
        return;
      }
      onCreated?.();
      onClose();
      // Reset fields for next time.
      setPickedServiceIds([]);
      setPickedVariantBy({});
      setNotes("");
      setStaffNotes("");
      setOverrideConflicts(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl m-0 sm:m-6 p-4 sm:p-6 shadow-2xl max-h-[100dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading text-2xl">New Appointment</h2>
            <p className="text-navy/50 text-xs font-body">
              Walk-in or phone booking — bypasses captcha / rate-limits.
            </p>
          </div>
          <button onClick={onClose} className="text-navy/40 hover:text-navy text-2xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-body text-navy/50 mb-1">Services *</label>
            <div className="max-h-48 overflow-y-auto border border-navy/10">
              {services.length === 0 ? (
                <p className="p-3 text-xs text-navy/40 font-body">Loading services…</p>
              ) : (
                services.map((s) => {
                  const picked = pickedServiceIds.includes(s.id);
                  return (
                    <div key={s.id} className="border-b border-navy/5 last:border-b-0">
                      <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-cream/30">
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={() => toggleService(s.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body truncate">{s.name}</p>
                          <p className="text-[10px] text-navy/40 font-body">
                            {s.category} · {s.duration} min · {s.price_text}
                          </p>
                        </div>
                      </label>
                      {picked && s.variants && s.variants.length > 0 && (
                        <div className="px-10 py-2 bg-cream/30">
                          <select
                            value={pickedVariantBy[s.id] || ""}
                            onChange={(e) =>
                              setPickedVariantBy((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                            className="w-full border border-navy/20 px-2 py-1.5 text-xs font-body"
                          >
                            <option value="">Pick variant…</option>
                            {s.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} — {v.price_text} · {v.duration} min
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {totalDuration > 0 && (
              <p className="text-xs text-navy/50 font-body mt-1">Total duration: {totalDuration} min</p>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-body text-navy/50 mb-1">Stylist *</label>
              <select
                value={stylistId}
                onChange={(e) => setStylistId(e.target.value)}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              >
                <option value="">Select…</option>
                {stylists.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-body text-navy/50 mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-navy/50 mb-1">Start time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                step={900}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body text-navy/50 mb-1">Client name *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-navy/50 mb-1">Client email *</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body text-navy/50 mb-1">Client phone</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-navy/50 mb-1">Initial status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "pending" | "confirmed" | "completed")}
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed (logging a past visit)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-body text-navy/50 mb-1">Client notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-body text-navy/50 mb-1">Internal staff notes</label>
            <textarea
              rows={2}
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overrideConflicts}
              onChange={(e) => setOverrideConflicts(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-body">
              Override conflicts (book even if the stylist is busy or off-hours)
            </span>
          </label>

          {error && <p className="text-red-600 text-sm font-body">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="sm:flex-1 px-4 py-2 border border-navy/20 text-sm font-body hover:bg-navy/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="sm:flex-1 px-4 py-2 bg-rose text-white text-sm font-body hover:bg-rose-light disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create appointment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
