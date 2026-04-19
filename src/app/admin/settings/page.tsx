"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";

interface Settings {
  staff_notification_emails?: string;
  booking_email_enabled?: string;
  long_appointment_deposit_cents?: string;
  long_appointment_min_minutes?: string;
}

export default function SettingsPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [s, setS] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
