"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";

interface Settings {
  staff_notification_emails?: string;
  staff_notification_sms_numbers?: string;
  booking_email_enabled?: string;
  long_appointment_deposit_cents?: string;
  long_appointment_min_minutes?: string;
  sms_enabled?: string;
  sms_booking_confirm_enabled?: string;
  sms_booking_reminder_enabled?: string;
  sms_booking_status_change_enabled?: string;
  sms_booking_cancelled_enabled?: string;
  sms_booking_reschedule_enabled?: string;
  sms_staff_new_booking_enabled?: string;
}

// Small helper — treat undefined/empty as the default ("true") so a fresh
// install has every SMS event enabled by default.
const truthy = (v: string | undefined, fallback = "true") => ((v ?? fallback) === "true");

export default function SettingsPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [s, setS] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session?.user as any)?.role || "admin";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => setS(data || {}))
      .finally(() => setLoading(false));
  }, [status]);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSaving(false);
    if (res.ok) {
      setToast({ type: "success", message: "Settings saved." });
    } else {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed to save settings." });
    }
  };

  const sendTestSms = async () => {
    if (!testPhone.trim()) {
      setToast({ type: "error", message: "Enter a phone number first." });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/admin/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setToast({ type: "success", message: `Test SMS queued to ${testPhone.trim()}.` });
      else setToast({ type: "error", message: data.error || "Test SMS failed." });
    } finally {
      setTesting(false);
    }
  };

  if (status !== "authenticated") return null;
  if (role !== "admin") {
    return <p className="p-8 font-body text-navy/60">Settings are admins-only.</p>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="font-heading text-3xl mb-2">Settings</h1>
      <p className="text-navy/50 font-body text-sm mb-8">
        Configure salon-wide preferences. Email recipients here receive every new booking alert.
      </p>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading...</p>
      ) : (
        <div className="space-y-8">
          <section className="bg-white border border-navy/10 p-6">
            <h2 className="font-heading text-lg mb-1">Staff notification emails</h2>
            <p className="text-navy/50 font-body text-xs mb-4">
              One email per line, or comma-separated. These addresses receive an alert for every new
              online booking. If this is empty, nobody gets notified.
            </p>
            {!(s.staff_notification_emails && s.staff_notification_emails.trim()) && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-body">
                ⚠ No recipients saved — new bookings are not triggering email alerts.
              </div>
            )}
            <textarea
              rows={5}
              value={s.staff_notification_emails || ""}
              onChange={(e) => setS({ ...s, staff_notification_emails: e.target.value })}
              placeholder="e.g. manager@example.com, receptionist@example.com"
              className="w-full border border-navy/20 px-3 py-2 text-sm font-body placeholder:text-navy/25 placeholder:italic"
            />
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={(s.booking_email_enabled ?? "true") === "true"}
                onChange={(e) =>
                  setS({ ...s, booking_email_enabled: e.target.checked ? "true" : "false" })
                }
                className="w-4 h-4"
              />
              <span className="text-sm font-body">Send email alerts for new bookings</span>
            </label>
          </section>

          <section className="bg-white border border-navy/10 p-6">
            <h2 className="font-heading text-lg mb-4">Deposit policy</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-navy/50 font-body mb-1">
                  Trigger duration (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={s.long_appointment_min_minutes || "100"}
                  onChange={(e) =>
                    setS({ ...s, long_appointment_min_minutes: e.target.value })
                  }
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                />
              </div>
              <div>
                <label className="block text-xs text-navy/50 font-body mb-1">
                  Deposit amount (cents)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={s.long_appointment_deposit_cents || "5000"}
                  onChange={(e) =>
                    setS({ ...s, long_appointment_deposit_cents: e.target.value })
                  }
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                />
                <p className="text-navy/40 text-xs font-body mt-1">
                  Stored in cents — e.g. 5000 = $50.
                </p>
              </div>
            </div>
            <p className="text-navy/40 text-xs font-body mt-4">
              Appointments with a total duration at or above the trigger will require this deposit
              before the customer can confirm.
            </p>
          </section>

          <section className="bg-white border border-navy/10 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-heading text-lg mb-1">SMS notifications</h2>
                <p className="text-navy/50 font-body text-xs">
                  Requires Twilio env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).
                  Trial Twilio numbers can only text verified phones and stamp a &ldquo;Sent from a
                  trial account&rdquo; prefix on every message.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={truthy(s.sms_enabled)}
                  onChange={(e) => setS({ ...s, sms_enabled: e.target.checked ? "true" : "false" })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-body">SMS enabled</span>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm font-body">
              {[
                ["sms_booking_confirm_enabled",       "Booking confirmation (new booking)"],
                ["sms_booking_reminder_enabled",      "Day-before reminder"],
                ["sms_booking_status_change_enabled", "Status changes (confirmed / completed / no-show)"],
                ["sms_booking_cancelled_enabled",     "Cancellation notice"],
                ["sms_booking_reschedule_enabled",    "Reschedule notice"],
                ["sms_staff_new_booking_enabled",     "Staff alert on new booking"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer border border-navy/10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={truthy(s[key as keyof Settings])}
                    disabled={!truthy(s.sms_enabled)}
                    onChange={(e) => setS({ ...s, [key]: e.target.checked ? "true" : "false" })}
                    className="w-4 h-4"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="mt-5">
              <label className="block text-xs text-navy/50 font-body mb-1">
                Staff SMS recipients (for the new-booking alert)
              </label>
              <textarea
                rows={2}
                value={s.staff_notification_sms_numbers || ""}
                onChange={(e) => setS({ ...s, staff_notification_sms_numbers: e.target.value })}
                placeholder="e.g. +18185551234, 8185550000"
                className="w-full border border-navy/20 px-3 py-2 text-sm font-body placeholder:text-navy/25 placeholder:italic"
              />
              <p className="text-navy/40 text-[11px] font-body mt-1">
                One per line or comma-separated. 10-digit US numbers default to +1.
              </p>
            </div>

            <div className="mt-5 border-t border-navy/5 pt-4">
              <p className="text-xs font-body text-navy/60 mb-2">Test your Twilio config</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="tel"
                  placeholder="+18185551234"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="border border-navy/20 px-3 py-2 text-sm font-body min-w-[220px]"
                />
                <button
                  onClick={sendTestSms}
                  disabled={testing}
                  className="px-4 py-2 text-xs font-body border border-navy/30 hover:bg-navy/5 uppercase tracking-widest disabled:opacity-60"
                >
                  {testing ? "Sending…" : "Send test SMS"}
                </button>
              </div>
              <p className="text-navy/40 text-[11px] font-body mt-2">
                The test SMS bypasses the global toggle but still respects opt-outs. Check the SMS log
                under Activity if it doesn&apos;t arrive.
              </p>
            </div>
          </section>

          <button
            onClick={save}
            disabled={saving}
            className="bg-rose hover:bg-rose-light text-white text-sm font-body uppercase tracking-widest px-8 py-3 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}

      {toast && (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
