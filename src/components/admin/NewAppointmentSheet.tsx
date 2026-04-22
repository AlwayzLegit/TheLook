"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Checkbox, Switch } from "@/components/ui/Checkbox";
import { DatePicker, TimePicker } from "@/components/ui/DatePicker";
import { Tag } from "@/components/ui/Tag";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { displayEmail, formatMoney, formatDuration } from "@/lib/format";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/Toaster";

// ─── 2-step New Appointment — plan §7.4 ─────────────────────────────
// Step 1 "Who"  → client autocomplete over existing client_profiles + an
//                 inline "new client" fallback.
// Step 2 "What" → services multi-select, stylist (filtered to those
//                 who offer the selected services), date + real
//                 availability TimePicker, notes, advanced disclosure
//                 for override + test-booking.

interface ClientHit {
  email: string;
  name: string;
  phone: string | null;
  banned?: boolean;
}
interface Service {
  id: string;
  name: string;
  category: string;
  price_text: string;
  price_min?: number;
  duration: number;
}
interface Stylist {
  id: string;
  name: string;
  color?: string | null;
  serviceIds?: string[];
}
interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  prefill?: { name?: string; email?: string; phone?: string };
}

const STEP_WHO = 0;
const STEP_WHAT = 1;

export default function NewAppointmentSheet({ open, onClose, onCreated, prefill }: Props) {
  const [step, setStep] = useState<typeof STEP_WHO | typeof STEP_WHAT>(STEP_WHO);
  const [saving, setSaving] = useState(false);

  // Step 1 — client
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientHit[]>([]);
  const [client, setClient] = useState<{ name: string; email: string; phone: string; existing: boolean } | null>(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });

  // Step 2 — what
  const [servicesByCat, setServicesByCat] = useState<Record<string, Service[]>>({});
  const [allStylists, setAllStylists] = useState<Stylist[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [stylistId, setStylistId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [startTime, setStartTime] = useState<string>("");
  const [status, setStatus] = useState<"pending" | "confirmed" | "completed">("confirmed");
  const [clientNotes, setClientNotes] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [override, setOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when sheet reopens.
  useEffect(() => {
    if (!open) return;
    setStep(STEP_WHO);
    setSaving(false);
    setClient(null);
    setClientQuery("");
    setNewClientMode(false);
    setNewClient({ name: "", phone: "", email: "" });
    if (prefill?.email || prefill?.name || prefill?.phone) {
      setClient({
        name: prefill.name || "",
        email: prefill.email || "",
        phone: prefill.phone || "",
        existing: false,
      });
      setStep(STEP_WHAT);
    }
    setSelectedServiceIds([]);
    setStylistId("");
    setDate("");
    setAvailability([]);
    setStartTime("");
    setClientNotes("");
    setStaffNotes("");
    setOverride(false);
    setError(null);
  }, [open, prefill]);

  // Debounced client search.
  useEffect(() => {
    if (!open || step !== STEP_WHO) return;
    const q = clientQuery.trim();
    if (q.length < 2) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(q)}`);
        if (!r.ok) return;
        const data = await r.json();
        setClientResults(Array.isArray(data?.results) ? data.results : []);
      } catch {
        // ignore
      }
    }, 180);
    return () => clearTimeout(t);
  }, [clientQuery, open, step]);

  // Load services + stylists once when sheet opens.
  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/services")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const grouped: Record<string, Service[]> = {};
        for (const s of data as Service[]) {
          if (!grouped[s.category]) grouped[s.category] = [];
          grouped[s.category].push(s);
        }
        setServicesByCat(grouped);
      })
      .catch(() => {});
    fetch("/api/admin/stylists")
      .then((r) => r.json())
      .then(async (data) => {
        if (!Array.isArray(data)) return;
        // Fetch per-stylist service mappings so we can filter by which
        // stylists offer the selected services. Cheap — 5 stylists.
        const mappings = await Promise.all(
          (data as Stylist[]).map(async (s) => {
            try {
              const r = await fetch(`/api/admin/stylists/${s.id}/services`);
              if (!r.ok) return { ...s, serviceIds: [] as string[] };
              const ids = await r.json();
              return { ...s, serviceIds: Array.isArray(ids) ? ids : [] };
            } catch {
              return { ...s, serviceIds: [] as string[] };
            }
          }),
        );
        setAllStylists(mappings);
      })
      .catch(() => {});
  }, [open]);

  // Pull real availability slots when we have stylist + date + services.
  useEffect(() => {
    if (step !== STEP_WHAT) return;
    if (!stylistId || !date || selectedServiceIds.length === 0) {
      setAvailability([]);
      return;
    }
    setCheckingAvail(true);
    const qs = [
      `stylistId=${stylistId}`,
      `date=${date}`,
      ...selectedServiceIds.map((id) => `serviceIds=${id}`),
    ].join("&");
    fetch(`/api/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailability(Array.isArray(data?.slots) ? data.slots : []);
      })
      .catch(() => setAvailability([]))
      .finally(() => setCheckingAvail(false));
  }, [stylistId, date, selectedServiceIds, step]);

  // Derived: services flattened + totals.
  const allServicesFlat = useMemo(() => Object.values(servicesByCat).flat(), [servicesByCat]);
  const selectedServices = useMemo(
    () => allServicesFlat.filter((s) => selectedServiceIds.includes(s.id)),
    [allServicesFlat, selectedServiceIds],
  );
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalPriceMin = selectedServices.reduce((sum, s) => sum + (s.price_min || 0), 0);

  // Stylists who offer EVERY selected service.
  const eligibleStylists = useMemo(() => {
    const real = allStylists.filter((s) => s.name?.trim().toLowerCase() !== "any stylist");
    if (selectedServiceIds.length === 0) return real;
    return real.filter((s) => selectedServiceIds.every((sid) => (s.serviceIds || []).includes(sid)));
  }, [allStylists, selectedServiceIds]);

  const selectClient = (hit: ClientHit) => {
    setClient({
      name: hit.name,
      email: hit.email,
      phone: hit.phone || "",
      existing: true,
    });
    setClientQuery("");
    setClientResults([]);
    setStep(STEP_WHAT);
  };
  const confirmNewClient = () => {
    if (!newClient.name.trim()) { toast.error("Name is required."); return; }
    if (!newClient.email.trim() && !newClient.phone.trim()) {
      toast.error("Add either an email or a phone number.");
      return;
    }
    setClient({
      name: newClient.name.trim(),
      email: newClient.email.trim().toLowerCase(),
      phone: newClient.phone.trim(),
      existing: false,
    });
    setNewClientMode(false);
    setStep(STEP_WHAT);
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setStartTime("");
  };

  const submit = async () => {
    if (!client) { setError("Pick or create a client first."); return; }
    if (selectedServiceIds.length === 0) { setError("Select at least one service."); return; }
    if (!stylistId) { setError("Pick a stylist."); return; }
    if (!date) { setError("Pick a date."); return; }
    if (!startTime) { setError("Pick a time."); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServiceIds,
          variantIds: selectedServiceIds.map(() => ""),
          stylistId,
          date,
          startTime,
          clientName: client.name,
          clientEmail: client.email || `phone-${client.phone.replace(/\D/g, "")}@noemail.thelookhairsalonla.com`,
          clientPhone: client.phone || null,
          notes: clientNotes || null,
          staffNotes: staffNotes || null,
          status,
          overrideConflicts: override,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create appointment.");
        return;
      }
      toast.success("Appointment created.");
      onCreated?.(data.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const footer = step === STEP_WHO ? (
    <>
      <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
    </>
  ) : (
    <>
      <Button variant="ghost" size="sm" onClick={() => setStep(STEP_WHO)}>← Back</Button>
      <div className="flex-1" />
      <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      <Button variant="primary" size="sm" onClick={submit} loading={saving}>
        Create appointment
      </Button>
    </>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={step === STEP_WHO ? "New appointment — who?" : "New appointment — what?"}
      description={
        step === STEP_WHO
          ? "Search an existing client or add a new one."
          : client
            ? `For ${client.name}${displayEmail(client.email) ? ` · ${displayEmail(client.email)}` : client.phone ? ` · ${client.phone}` : ""}`
            : ""
      }
      size="lg"
      footer={footer}
    >
      {step === STEP_WHO ? (
        <div className="space-y-4">
          {!newClientMode && (
            <>
              <Input
                autoFocus
                label="Search clients"
                placeholder="Name, email, or phone…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                hint="Starts showing matches at 2+ characters."
              />
              {clientQuery.trim().length >= 2 && (
                <div className="rounded-md border border-[var(--color-border)] divide-y divide-[var(--color-border)] max-h-72 overflow-y-auto">
                  {clientResults.length === 0 ? (
                    <p className="px-3 py-4 text-[0.8125rem] text-[var(--color-text-subtle)]">No matches.</p>
                  ) : (
                    clientResults.map((c) => (
                      <button
                        key={c.email}
                        type="button"
                        onClick={() => selectClient(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-cream-50)] flex items-center gap-3"
                      >
                        <span className="h-7 w-7 rounded-full bg-[var(--color-cream-200)] text-[var(--color-text-muted)] text-[0.75rem] flex items-center justify-center shrink-0">
                          {c.name.charAt(0).toUpperCase() || "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.8125rem] text-[var(--color-text)] flex items-center gap-1.5">
                            {c.name}
                            {c.banned && <Badge tone="danger" size="sm">Banned</Badge>}
                          </p>
                          <p className="text-[0.6875rem] text-[var(--color-text-subtle)] truncate">
                            {displayEmail(c.email) || c.phone || "—"}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={() => setNewClientMode(true)}>
                  + New client
                </Button>
              </div>
            </>
          )}

          {newClientMode && (
            <div className="space-y-3 rounded-md border border-[var(--color-border)] p-4 bg-[var(--color-cream-50)]">
              <p className="text-[0.6875rem] uppercase tracking-wider text-[var(--color-text-subtle)]">New client</p>
              <Input
                label="Name"
                required
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="e.g., Alicia A."
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="(818) 555-1234"
                />
                <Input
                  label="Email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="optional"
                />
              </div>
              <p className="text-[0.75rem] text-[var(--color-text-subtle)]">
                At least one of phone or email is required — the phone-only flow still creates a profile.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setNewClientMode(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={confirmNewClient}>Use this client</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Services */}
          <section>
            <h3 className="text-[0.75rem] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Services</h3>
            {Object.keys(servicesByCat).length === 0 ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-4">
                {Object.entries(servicesByCat).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[0.6875rem] uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">{cat}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {items.map((s) => {
                        const picked = selectedServiceIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-2 rounded-md border cursor-pointer text-[0.8125rem] transition-colors",
                              picked
                                ? "border-[var(--color-crimson-600)] bg-[var(--color-crimson-600)]/5"
                                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                            )}
                          >
                            <Checkbox checked={picked} onCheckedChange={() => toggleService(s.id)} />
                            <span className="flex-1 truncate text-[var(--color-text)]">{s.name}</span>
                            <span className="text-[var(--color-accent-gold)] text-[0.75rem]">{s.price_text}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedServiceIds.length > 0 && (
              <div className="mt-3 flex items-center gap-3 text-[0.75rem] text-[var(--color-text-muted)]">
                <span>{selectedServiceIds.length} selected</span>
                <span>·</span>
                <span>{formatDuration(totalDuration)}</span>
                <span>·</span>
                <span className="text-[var(--color-accent-gold)]">{formatMoney(totalPriceMin, { from: "cents" })}</span>
              </div>
            )}
          </section>

          {/* Stylist */}
          <section>
            <h3 className="text-[0.75rem] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Stylist</h3>
            <Select
              value={stylistId}
              onChange={(e) => { setStylistId(e.target.value); setStartTime(""); }}
            >
              <option value="">Choose a stylist…</option>
              {eligibleStylists.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {selectedServiceIds.length > 0 && eligibleStylists.length === 0 && (
              <p className="mt-2 text-[0.75rem] text-[var(--color-warning)]">
                No stylist offers all selected services.
              </p>
            )}
            {stylistId && (
              <div className="mt-2">
                {(() => {
                  const st = eligibleStylists.find((s) => s.id === stylistId);
                  if (!st?.color) return null;
                  return <Tag color={st.color}>{st.name}</Tag>;
                })()}
              </div>
            )}
          </section>

          {/* Date + time */}
          <section className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Date"
              required
              value={date}
              onChange={(d) => { setDate(d); setStartTime(""); }}
              minDate={new Date()}
            />
            <TimePicker
              label="Start time"
              required
              value={startTime || null}
              onChange={setStartTime}
              options={availability.length > 0 ? availability : undefined}
              placeholder={
                !stylistId || !date
                  ? "Pick stylist + date first"
                  : checkingAvail
                    ? "Checking availability…"
                    : availability.length === 0 && override
                      ? "Any time (override on)"
                      : "Select a time"
              }
              disabled={!stylistId || !date || (!override && availability.length === 0 && !checkingAvail)}
            />
          </section>
          {date && stylistId && !checkingAvail && availability.length === 0 && !override && (
            <p className="-mt-3 text-[0.75rem] text-[var(--color-warning)]">
              No open slots for this stylist on {date}. Tick &ldquo;Override conflicts&rdquo; below to book anyway.
            </p>
          )}

          {/* Notes */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Textarea
              label="Client-visible notes"
              hint="Sent with the confirmation email."
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              rows={2}
            />
            <Textarea
              label="Internal staff notes"
              hint="Only visible in admin."
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              rows={2}
            />
          </section>

          {/* Status + advanced */}
          <section className="flex items-center justify-between gap-4">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="max-w-[14rem]"
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending approval</option>
              <option value="completed">Completed (past)</option>
            </Select>
          </section>

          <details className="rounded-md border border-[var(--color-border)]">
            <summary className="cursor-pointer px-3 py-2 text-[0.8125rem] text-[var(--color-text-muted)]">
              Advanced
            </summary>
            <div className="px-3 pb-3 space-y-3">
              <Switch
                checked={override}
                onCheckedChange={setOverride}
                label="Override conflicts"
                hint="Allow booking outside regular hours or over another appointment."
              />
            </div>
          </details>

          {error && (
            <div className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-[0.8125rem] text-[var(--color-danger)]">
              {error}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
