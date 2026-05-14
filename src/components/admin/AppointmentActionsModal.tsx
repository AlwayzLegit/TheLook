"use client";

import { useState, useEffect } from "react";
import ReviewRequestModal from "./ReviewRequestModal";
import RefundDialog from "./RefundDialog";
import {
  timeToMinutes,
  minutesToTime,
  diffMinutes,
  formatDurationLabel,
} from "@/lib/appointmentTime";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  sms_consent?: boolean | null;
  serviceName: string;
  stylistName: string;
  // Current assigned stylist id — needed so the edit form's stylist
  // dropdown can preselect them and detect changes.
  stylist_id?: string | null;
  // false = booking landed via "Any Stylist". true / null = customer
  // requested this stylist. Surfaced in the edit form so admin sees
  // when a reassignment is appropriate (e.g. someone else covered).
  requested_stylist?: boolean | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  staff_notes?: string | null;
  archived_at?: string | null;
  stripe_customer_id?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  cancellation_fee_charged_cents?: number | null;
  // Required deposit in cents (0 / null = no deposit requested at
  // booking time). Combined with deposit_status from the API to
  // render the "$X deposit paid / refunded / pending" pill.
  deposit_required_cents?: number | null;
  // Server-derived state: "none" | "paid" | "refunded" | "pending".
  // "none" hides the pill; the others control its label + colour.
  deposit_status?: "none" | "paid" | "refunded" | "pending";
  review_request_sent_at?: string | null;
}

interface StylistOption {
  id: string;
  name: string;
  active?: boolean;
}

// Catalog row for the "+ Add service…" picker. Mirrors the parent's
// services list so we can show price + duration defaults when adding
// a new line, and look up names for existing lines.
interface ServiceCatalogOption {
  id: string;
  name: string;
  price_min?: number | null;
  duration?: number | null;
  active?: boolean | null;
  // Used by the picker to group services under <optgroup> labels so
  // operators don't scroll past 30+ flat alphabetical entries.
  category?: string | null;
}

// One editable service line in the modal. Mirrors the inline list-view
// shape so the PATCH payload has identical structure.
interface ModalServiceLine {
  service_id: string;
  name: string;
  price_min: number;
  duration: number;
  sort_order: number;
}

export interface AppointmentEditFields {
  date: string;
  start_time: string;
  end_time: string;
  staff_notes: string;
  stylist_id: string;
  // When the admin edited per-line prices/durations in the modal, the
  // parent forwards these to /api/admin/appointments/[id] which
  // replaces appointment_services. Omitted when no service edits were
  // made so the PATCH skips the services-replace path.
  services?: Array<{
    service_id: string;
    price_min: number;
    duration: number;
    sort_order: number;
  }>;
}

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
  onUnarchive: (id: string) => void | Promise<void>;
  onSaveEdit: (id: string, fields: AppointmentEditFields) => void | Promise<void>;
  // Open the New Appointment sheet pre-filled with this client's
  // name / email / phone — saves the operator from re-searching by
  // name at checkout when the client wants to book their next slot.
  onRebook?: (client: { name: string; email: string; phone: string | null }) => void;
  // List of stylists the admin can reassign to. Comes from the parent
  // page so the modal doesn't have to refetch.
  stylists?: StylistOption[];
  // Services catalog for the per-line editor — needed to render the
  // "+ Add service…" dropdown and to look up names/defaults.
  services?: ServiceCatalogOption[];
  pending: boolean;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

export default function AppointmentActionsModal({
  appointment,
  onClose,
  onStatusChange,
  onDelete,
  onArchive,
  onUnarchive,
  onSaveEdit,
  onRebook,
  stylists = [],
  services = [],
  pending,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<AppointmentEditFields>({
    date: "",
    start_time: "",
    end_time: "",
    staff_notes: "",
    stylist_id: "",
  });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  // Per-service editable lines. Owner edits price/duration here so the
  // next time this client books the same service we can keep pricing
  // consistent across visits.
  const [serviceLines, setServiceLines] = useState<ModalServiceLine[]>([]);
  const [servicesEdited, setServicesEdited] = useState(false);
  const [endOverridden, setEndOverridden] = useState(false);
  const [addServiceId, setAddServiceId] = useState("");
  const totalMinutes = serviceLines.reduce((sum, l) => sum + (l.duration || 0), 0);
  const serviceCount = serviceLines.length;

  useEffect(() => {
    if (appointment) {
      setFields({
        date: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        staff_notes: appointment.staff_notes || "",
        stylist_id: appointment.stylist_id || "",
      });
      setEditing(false);
      setServiceLines([]);
      setServicesEdited(false);
      setEndOverridden(false);
      setAddServiceId("");
    }
    // Gate on the appointment id, not the object reference. The parent
    // (admin/appointments/page.tsx) passes a freshly-derived
    // enrichedAppts.find(...) result on every render, which produces a
    // new object identity on every poll tick AND every other state
    // change. Depending on `appointment` itself caused this effect to
    // re-fire on every parent re-render, which reset `editing` back
    // to false a couple seconds into any edit — making the inline
    // edit form auto-close while the admin was still typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.id]);

  // Pull appointment_services for this booking once per modal open so
  // we can render an editable per-service breakdown. Snapshotted at
  // booking time — immune to later edits of the underlying services
  // table. Falls back to a single line synthesised from the
  // appointment row itself for legacy single-service imports without
  // a mapping row.
  useEffect(() => {
    if (!appointment) return;
    let cancelled = false;
    const apptStart = appointment.start_time;
    const apptEnd = appointment.end_time;
    const apptId = appointment.id;
    fetch(`/api/admin/appointments/${apptId}/services`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          services?: Array<{
            service_id: string;
            duration: number | null;
            price_min: number | null;
            sort_order: number | null;
          }>;
        } | null) => {
          if (cancelled) return;
          const rows = Array.isArray(data?.services) ? data!.services! : [];
          const lines: ModalServiceLine[] = rows.map((r, i) => ({
            service_id: r.service_id,
            name: services.find((s) => s.id === r.service_id)?.name || "Service",
            price_min: Number.isFinite(r.price_min) ? Number(r.price_min) : 0,
            duration:
              Number.isFinite(r.duration) && (r.duration as number) > 0
                ? Number(r.duration)
                : 30,
            sort_order: typeof r.sort_order === "number" ? r.sort_order : i,
          }));
          if (lines.length === 0) {
            const fallback = diffMinutes(apptStart, apptEnd);
            lines.push({
              service_id: "",
              name: "Service",
              price_min: 0,
              duration: fallback > 0 ? fallback : 30,
              sort_order: 0,
            });
          }
          setServiceLines(lines);
        },
      )
      .catch(() => {
        const fallback = diffMinutes(apptStart, apptEnd);
        setServiceLines([
          {
            service_id: "",
            name: "Service",
            price_min: 0,
            duration: fallback > 0 ? fallback : 30,
            sort_order: 0,
          },
        ]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.id]);

  if (!appointment) return null;

  const isArchived = Boolean(appointment.archived_at);
  const canArchive = ["cancelled", "no_show", "completed"].includes(appointment.status) && !isArchived;

  // Issue 1 fix: backdrop is no longer click-to-close. Native iOS time
  // pickers occasionally bubble their dismissal as a tap on whatever's
  // behind, which made the modal close mid-edit. Close is now strictly
  // via the X button or Cancel — predictable on every device.
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-5 py-4 border-b border-navy/10 sticky top-0 bg-white">
          <div className="min-w-0">
            <p className="font-body font-bold text-base truncate">{appointment.client_name}</p>
            <p className="text-xs font-body text-navy/50 truncate">
              {appointment.client_email}
              {appointment.client_phone ? ` · ${appointment.client_phone}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-navy/40 hover:text-navy text-2xl leading-none pl-4"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <p className="font-body text-sm text-navy/80">{appointment.serviceName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-body text-xs text-navy/50">with {appointment.stylistName}</p>
              {/* Mirror the inline-list badge so admins can tell at a
                  glance whether the customer asked for this stylist
                  specifically (Requested) or whether they picked
                  "Any" and we filled the slot. requested_stylist is
                  null on legacy rows that pre-date the column —
                  show nothing in that case. */}
              {appointment.requested_stylist === false ? (
                <span className="text-[10px] uppercase tracking-widest font-body bg-amber-100 text-amber-800 px-1.5 py-0.5">
                  Any stylist
                </span>
              ) : appointment.requested_stylist === true ? (
                <span className="text-[10px] uppercase tracking-widest font-body bg-emerald-100 text-emerald-800 px-1.5 py-0.5">
                  Requested
                </span>
              ) : null}
            </div>
            <p className="font-body text-sm text-navy mt-2">
              {formatDate(appointment.date)}
            </p>
            <p className="font-body text-sm text-navy">
              {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className={`inline-block text-xs font-body px-2 py-0.5 ${
                appointment.status === "confirmed" ? "bg-green-100 text-green-700" :
                appointment.status === "cancelled" ? "bg-red-100 text-red-700" :
                appointment.status === "completed" ? "bg-blue-100 text-blue-700" :
                appointment.status === "no_show" ? "bg-gray-100 text-gray-700" :
                "bg-gold/20 text-gold"
              }`}>
                {appointment.status}
              </span>
              {isArchived && (
                <span className="inline-block text-xs font-body bg-navy/5 text-navy/60 px-2 py-0.5">
                  archived
                </span>
              )}
              {/* Deposit pill — three variants driven by the
                  server-computed deposit_status (which folds in the
                  charges ledger so refunds read distinctly):
                    paid     → emerald, "$X deposit paid"
                    refunded → slate,  "$X deposit refunded"
                    pending  → amber,  "$X deposit pending"
                  none → no pill (booking didn't need a deposit).
                  Amount shown is the required value in dollars;
                  CC-surcharge overage is intentionally omitted. */}
              {(appointment.deposit_status === "paid" ||
                appointment.deposit_status === "refunded" ||
                appointment.deposit_status === "pending") &&
                (appointment.deposit_required_cents ?? 0) > 0 && (
                  <span
                    className={
                      "inline-block text-xs font-body px-2 py-0.5 " +
                      (appointment.deposit_status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : appointment.deposit_status === "refunded"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-800")
                    }
                  >
                    ${Math.round((appointment.deposit_required_cents ?? 0) / 100)}
                    {" "}deposit{" "}
                    {appointment.deposit_status === "paid"
                      ? "paid"
                      : appointment.deposit_status === "refunded"
                        ? "refunded"
                        : "pending"}
                  </span>
                )}
            </div>
          </div>

          {editing ? (
            <div className="space-y-3 p-3 bg-cream/50 border border-navy/10">
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">
                  Stylist
                  {appointment.requested_stylist === false && (
                    <span className="ml-2 text-[10px] font-body text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded normal-case tracking-normal">
                      Booked as Any — set who actually did the service
                    </span>
                  )}
                </label>
                <select
                  value={fields.stylist_id}
                  onChange={(e) => setFields({ ...fields, stylist_id: e.target.value })}
                  className="border border-navy/20 px-2 py-1.5 text-sm font-body bg-white w-full sm:w-auto"
                >
                  {/* If the assigned stylist is somehow inactive (deleted /
                      hidden) we still need to render their option so the
                      select shows the current value. Filter active for the
                      rest of the list. */}
                  {!stylists.some((s) => s.id === fields.stylist_id) && fields.stylist_id && (
                    <option value={fields.stylist_id}>
                      {appointment.stylistName} (current)
                    </option>
                  )}
                  {stylists
                    .filter((s) => s.active !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Date</label>
                  <input type="date" value={fields.date} onChange={(e) => setFields({ ...fields, date: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Start</label>
                  <input
                    type="time"
                    value={fields.start_time}
                    onChange={(e) => {
                      const next = e.target.value;
                      // Auto-shift end_time by the live total duration so
                      // a single edit keeps the slot length intact —
                      // unless the admin manually overrode End during
                      // this edit session.
                      setFields((f) => {
                        if (!endOverridden && totalMinutes > 0 && next) {
                          return {
                            ...f,
                            start_time: next,
                            end_time: minutesToTime(timeToMinutes(next) + totalMinutes),
                          };
                        }
                        return { ...f, start_time: next };
                      });
                    }}
                    className="border border-navy/20 px-2 py-1.5 text-sm font-body"
                  />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">End</label>
                  <input
                    type="time"
                    value={fields.end_time}
                    onChange={(e) => {
                      setEndOverridden(true);
                      setFields({ ...fields, end_time: e.target.value });
                    }}
                    className="border border-navy/20 px-2 py-1.5 text-sm font-body"
                  />
                </div>
              </div>
              {totalMinutes > 0 && !endOverridden && (
                <p className="text-[11px] font-body text-navy/50 -mt-1">
                  Auto-set from {serviceCount} service{serviceCount === 1 ? "" : "s"} ·{" "}
                  {formatDurationLabel(totalMinutes)} total. Edit End to override.
                </p>
              )}
              {totalMinutes > 0 && endOverridden && (
                <p className="text-[11px] font-body text-navy/50 -mt-1">
                  End time manually overridden ({formatDurationLabel(totalMinutes)} of services).
                </p>
              )}

              {/* Services & Prices — owner edits per-line so repeat
                  visits stay consistent ("$100 Full Color last time →
                  $100 Full Color this time"). */}
              <div className="space-y-2">
                <label className="block text-xs font-body text-navy/40">Services &amp; Prices</label>
                {serviceLines.length === 0 && (
                  <p className="text-[11px] font-body text-amber-700 bg-amber-50 px-2 py-1.5 border border-amber-200">
                    No services on this appointment yet. Add at least one before saving.
                  </p>
                )}
                {serviceLines.map((line, idx) => (
                  <div
                    key={`${line.service_id || "blank"}-${idx}`}
                    className="flex flex-wrap items-end gap-2 bg-white border border-navy/10 px-3 py-2"
                  >
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-sm font-body text-navy">{line.name}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-body text-navy/40 mb-0.5">Price ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={Math.round(line.price_min / 100)}
                        onChange={(e) => {
                          const dollars = parseInt(e.target.value, 10);
                          const cents = Number.isFinite(dollars) ? Math.max(0, dollars) * 100 : 0;
                          setServiceLines((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, price_min: cents } : l)),
                          );
                          setServicesEdited(true);
                        }}
                        className="w-24 border border-navy/20 px-2 py-1 text-sm font-body"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-body text-navy/40 mb-0.5">Duration (min)</label>
                      <input
                        type="number"
                        min={1}
                        step={5}
                        value={line.duration}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10);
                          const safe = Number.isFinite(next) && next > 0 ? next : 1;
                          setServiceLines((prev) => {
                            const updated = prev.map((l, i) =>
                              i === idx ? { ...l, duration: safe } : l,
                            );
                            if (!endOverridden && fields.start_time) {
                              const newTotal = updated.reduce((sum, l) => sum + (l.duration || 0), 0);
                              if (newTotal > 0) {
                                setFields((f) => ({
                                  ...f,
                                  end_time: minutesToTime(timeToMinutes(f.start_time) + newTotal),
                                }));
                              }
                            }
                            return updated;
                          });
                          setServicesEdited(true);
                        }}
                        className="w-20 border border-navy/20 px-2 py-1 text-sm font-body"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceLines((prev) => {
                          const updated = prev.filter((_, i) => i !== idx);
                          if (!endOverridden && fields.start_time) {
                            const newTotal = updated.reduce((sum, l) => sum + (l.duration || 0), 0);
                            setFields((f) => ({
                              ...f,
                              end_time: newTotal > 0
                                ? minutesToTime(timeToMinutes(f.start_time) + newTotal)
                                : f.end_time,
                            }));
                          }
                          return updated;
                        });
                        setServicesEdited(true);
                      }}
                      className="text-xs font-body text-red-600 border border-red-200 px-2 py-1 hover:bg-red-50"
                      aria-label={`Remove ${line.name}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(() => {
                  const available = services.filter(
                    (s) => s.active !== false && !serviceLines.some((l) => l.service_id === s.id),
                  );
                  if (available.length === 0) return null;
                  // Group by DB category in the canonical display order
                  // — same buckets the public /services hub uses
                  // (Haircuts → Color → Styling → Treatments → Facial
                  // Services). Anything with an unrecognised or empty
                  // category falls into "Other" at the bottom so legacy
                  // rows don't disappear from the picker.
                  const CATEGORY_ORDER: Array<{ key: string; label: string }> = [
                    { key: "Haircuts", label: "Haircuts" },
                    { key: "Color", label: "Color & Highlights" },
                    { key: "Styling", label: "Styling" },
                    { key: "Treatments", label: "Treatments" },
                    { key: "Facial Services", label: "Facial Services" },
                  ];
                  const buckets = new Map<string, ServiceCatalogOption[]>();
                  for (const { key } of CATEGORY_ORDER) buckets.set(key, []);
                  const other: ServiceCatalogOption[] = [];
                  for (const s of available) {
                    const cat = (s.category ?? "").trim();
                    if (cat && buckets.has(cat)) buckets.get(cat)!.push(s);
                    else other.push(s);
                  }
                  return (
                    <div className="flex flex-wrap items-end gap-2">
                      <select
                        value={addServiceId}
                        onChange={(e) => setAddServiceId(e.target.value)}
                        className="border border-navy/20 px-2 py-1.5 text-sm font-body bg-white"
                      >
                        <option value="">+ Add service…</option>
                        {CATEGORY_ORDER.map(({ key, label }) => {
                          const items = buckets.get(key) ?? [];
                          if (items.length === 0) return null;
                          return (
                            <optgroup key={key} label={label}>
                              {items.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                        {other.length > 0 && (
                          <optgroup label="Other">
                            {other.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <button
                        type="button"
                        disabled={!addServiceId}
                        onClick={() => {
                          const svc = services.find((s) => s.id === addServiceId);
                          if (!svc) return;
                          const priceMin = Number.isFinite(svc.price_min) ? Number(svc.price_min) : 0;
                          const dur =
                            Number.isFinite(svc.duration) && (svc.duration as number) > 0
                              ? Number(svc.duration)
                              : 30;
                          setServiceLines((prev) => {
                            const updated = [
                              ...prev,
                              {
                                service_id: svc.id,
                                name: svc.name,
                                price_min: priceMin,
                                duration: dur,
                                sort_order: prev.length,
                              },
                            ];
                            if (!endOverridden && fields.start_time) {
                              const newTotal = updated.reduce((sum, l) => sum + (l.duration || 0), 0);
                              setFields((f) => ({
                                ...f,
                                end_time: minutesToTime(timeToMinutes(f.start_time) + newTotal),
                              }));
                            }
                            return updated;
                          });
                          setAddServiceId("");
                          setServicesEdited(true);
                        }}
                        className="text-xs font-body bg-navy text-white px-3 py-1.5 hover:bg-navy/90 disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                  );
                })()}
                {serviceLines.length > 0 && (
                  <p className="text-[11px] font-body text-navy/50">
                    Total: $
                    {Math.round(
                      serviceLines.reduce((sum, l) => sum + (l.price_min || 0), 0) / 100,
                    )}
                    {" · "}
                    {formatDurationLabel(totalMinutes)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Staff Notes</label>
                <textarea value={fields.staff_notes} onChange={(e) => setFields({ ...fields, staff_notes: e.target.value })} rows={2} placeholder="Internal notes" className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Only forward `services` when the admin edited
                    // them — avoids unnecessarily rewriting
                    // appointment_services and burning the snapshot.
                    const payload: AppointmentEditFields = servicesEdited
                      ? {
                          ...fields,
                          services: serviceLines
                            .filter((l) => !!l.service_id)
                            .map((l, i) => ({
                              service_id: l.service_id,
                              price_min: Math.max(0, Math.round(l.price_min)),
                              duration: Math.max(1, Math.round(l.duration)),
                              sort_order: i,
                            })),
                        }
                      : fields;
                    onSaveEdit(appointment.id, payload);
                  }}
                  disabled={pending || (servicesEdited && serviceLines.length === 0)}
                  className="text-xs font-body bg-navy text-white px-4 py-1.5 hover:bg-navy/90 disabled:opacity-60"
                >
                  {pending ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs font-body text-navy/50 hover:text-navy px-3 py-1.5">
                  Cancel Edit
                </button>
              </div>
            </div>
          ) : appointment.staff_notes ? (
            <p className="text-navy/60 text-xs font-body bg-cream/50 px-3 py-2 border-l-2 border-gold/40">
              Staff: {appointment.staff_notes}
            </p>
          ) : null}

          {!editing && (
            <div className="flex flex-wrap gap-2">
              {!isArchived && appointment.status !== "cancelled" && appointment.status !== "completed" && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs font-body text-navy border border-navy/20 px-3 py-1.5 hover:bg-navy/5"
                  >
                    Edit
                  </button>
                  {appointment.status === "pending" && (
                    <button onClick={() => onStatusChange(appointment.id, "confirmed")} disabled={pending} className="text-xs font-body text-green-600 border border-green-200 px-3 py-1.5 hover:bg-green-50 disabled:opacity-60">
                      Confirm
                    </button>
                  )}
                  <button onClick={() => onStatusChange(appointment.id, "completed")} disabled={pending} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1.5 hover:bg-blue-50 disabled:opacity-60">
                    Mark Complete
                  </button>
                  <button onClick={() => onStatusChange(appointment.id, "no_show")} disabled={pending} className="text-xs font-body text-gray-600 border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60">
                    No Show
                  </button>
                  <button onClick={() => onStatusChange(appointment.id, "cancelled")} disabled={pending} className="text-xs font-body text-red-600 border border-red-200 px-3 py-1.5 hover:bg-red-50 disabled:opacity-60">
                    Cancel
                  </button>
                </>
              )}

              {appointment.status === "completed" && (
                <button
                  onClick={() => setReviewOpen(true)}
                  className="text-xs font-body text-gold border border-gold/40 px-3 py-1.5 hover:bg-gold/5"
                  title="Send a review request to this client"
                >
                  Send review request
                </button>
              )}

              {onRebook && (
                <button
                  onClick={() => {
                    // Skip the synthetic phone-XXX@noemail... placeholder so
                    // the operator isn't prompted to "use this real email"
                    // when the client never provided one. The phone alone
                    // is enough to identify them on the new booking.
                    const looksSynthetic =
                      typeof appointment.client_email === "string" &&
                      appointment.client_email.endsWith("@noemail.thelookhairsalonla.com");
                    onRebook({
                      name: appointment.client_name,
                      email: looksSynthetic ? "" : appointment.client_email,
                      phone: appointment.client_phone,
                    });
                  }}
                  disabled={pending}
                  className="text-xs font-body text-rose border border-rose/40 px-3 py-1.5 hover:bg-rose/10 disabled:opacity-60"
                  title="Open the new-appointment sheet pre-filled with this client"
                >
                  Rebook
                </button>
              )}

              {appointment.stripe_customer_id && (
                <button
                  onClick={() => setRefundOpen(true)}
                  disabled={pending}
                  className="text-xs font-body text-amber-700 border border-amber-200 px-3 py-1.5 hover:bg-amber-50 disabled:opacity-60"
                  title="Refund the Stripe deposit (full or partial)"
                >
                  Refund deposit
                </button>
              )}

              {canArchive && (
                <button
                  onClick={() => onArchive(appointment.id)}
                  disabled={pending}
                  className="text-xs font-body text-navy/70 border border-navy/20 px-3 py-1.5 hover:bg-navy/5 disabled:opacity-60"
                  title="Archive this appointment — auto-deletes after 30 days"
                >
                  Archive
                </button>
              )}

              {isArchived && (
                <button
                  onClick={() => onUnarchive(appointment.id)}
                  disabled={pending}
                  className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1.5 hover:bg-blue-50 disabled:opacity-60"
                >
                  Restore
                </button>
              )}

              <button
                onClick={() => onDelete(appointment.id)}
                disabled={pending}
                className="text-xs font-body text-red-700 border border-red-300 px-3 py-1.5 hover:bg-red-100 disabled:opacity-60 ml-auto"
                title="Delete permanently"
              >
                Delete
              </button>
            </div>
          )}

          {appointment.card_brand && (
            <p className="text-[11px] font-body text-navy/50">
              Card on file: {appointment.card_brand.toUpperCase()} •••{appointment.card_last4}
            </p>
          )}
        </div>
      </div>

      <ReviewRequestModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        appointment={{
          id: appointment.id,
          client_name: appointment.client_name,
          client_email: appointment.client_email,
          client_phone: appointment.client_phone,
          sms_consent: appointment.sms_consent,
          review_request_sent_at: appointment.review_request_sent_at,
        }}
      />

      <RefundDialog
        appointmentId={refundOpen ? appointment.id : null}
        clientName={appointment.client_name}
        onClose={() => setRefundOpen(false)}
      />
    </div>
  );
}
