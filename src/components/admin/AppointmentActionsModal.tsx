"use client";

import { useState, useEffect } from "react";
import ReviewRequestModal from "./ReviewRequestModal";
import RefundDialog from "./RefundDialog";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  sms_consent?: boolean | null;
  serviceName: string;
  stylistName: string;
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
}

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
  onUnarchive: (id: string) => void | Promise<void>;
  onSaveEdit: (id: string, fields: { date: string; start_time: string; end_time: string; staff_notes: string }) => void | Promise<void>;
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
  pending,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({ date: "", start_time: "", end_time: "", staff_notes: "" });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  useEffect(() => {
    if (appointment) {
      setFields({
        date: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        staff_notes: appointment.staff_notes || "",
      });
      setEditing(false);
    }
  }, [appointment]);

  if (!appointment) return null;

  const isArchived = Boolean(appointment.archived_at);
  const canArchive = ["cancelled", "no_show", "completed"].includes(appointment.status) && !isArchived;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
            <p className="font-body text-xs text-navy/50">with {appointment.stylistName}</p>
            <p className="font-body text-sm text-navy mt-2">
              {formatDate(appointment.date)}
            </p>
            <p className="font-body text-sm text-navy">
              {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
            </p>
            <div className="flex items-center gap-2 pt-1">
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
            </div>
          </div>

          {editing ? (
            <div className="space-y-3 p-3 bg-cream/50 border border-navy/10">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Date</label>
                  <input type="date" value={fields.date} onChange={(e) => setFields({ ...fields, date: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Start</label>
                  <input type="time" value={fields.start_time} onChange={(e) => setFields({ ...fields, start_time: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">End</label>
                  <input type="time" value={fields.end_time} onChange={(e) => setFields({ ...fields, end_time: e.target.value })} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Staff Notes</label>
                <textarea value={fields.staff_notes} onChange={(e) => setFields({ ...fields, staff_notes: e.target.value })} rows={2} placeholder="Internal notes" className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => onSaveEdit(appointment.id, fields)} disabled={pending} className="text-xs font-body bg-navy text-white px-4 py-1.5 hover:bg-navy/90 disabled:opacity-60">
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
