"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, Eyebrow } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Checkbox, Switch } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/components/ui/cn";
import { formatMoney } from "@/lib/format";
import { brandingDefaults } from "@/lib/branding";

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
  idle_timeout_minutes?: string;
  brand_name?: string;
  brand_tagline?: string;
  brand_address?: string;
  brand_phone?: string;
  brand_email?: string;
}

const truthy = (v: string | undefined, fallback = "true") => ((v ?? fallback) === "true");

type Section = "general" | "booking" | "notifications" | "sms" | "security";
const SECTIONS: Array<{ id: Section; label: string; hint: string }> = [
  { id: "general",       label: "General",       hint: "Salon details used across the site." },
  { id: "booking",       label: "Booking",       hint: "Deposit rules + booking behaviour." },
  { id: "notifications", label: "Notifications", hint: "Who gets emails on new bookings." },
  { id: "sms",           label: "SMS",           hint: "Twilio toggles + per-event controls." },
  { id: "security",      label: "Security",      hint: "Session timeout, lockouts." },
];

export default function SettingsPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [s, setS] = useState<Settings>({});
  const [initial, setInitial] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("general");
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
      .then((data) => { setS(data || {}); setInitial(data || {}); })
      .finally(() => setLoading(false));
  }, [status]);

  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (res.ok) {
        toast.success("Settings saved.");
        setInitial(s);
        // Push idle-timeout change into the shell live so the current
        // tab picks up the new value without a reload.
        if (s.idle_timeout_minutes) {
          document.documentElement.setAttribute("data-idle-timeout-min", s.idle_timeout_minutes);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone.trim()) { toast.error("Enter a phone number first."); return; }
    setTesting(true);
    try {
      const res = await fetch("/api/admin/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) toast.success(`Test SMS queued to ${testPhone.trim()}.`);
      else toast.error(data.error || "Test SMS failed.");
    } finally {
      setTesting(false);
    }
  };

  if (status !== "authenticated") return null;
  if (role !== "admin") {
    return <p className="p-8 font-body text-navy/60">Settings are admins-only.</p>;
  }

  const depositDollars = (() => {
    const cents = parseInt(s.long_appointment_deposit_cents || "5000", 10);
    return Number.isFinite(cents) ? cents / 100 : 50;
  })();

  return (
    <div className="p-4 sm:p-8 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <Eyebrow>Settings</Eyebrow>
        <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">Preferences</h1>
        <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2">Salon-wide defaults — changes here affect every admin + public surface.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Vertical sub-nav */}
          <nav className="space-y-0.5">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSection(sec.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md transition-colors",
                  section === sec.id
                    ? "bg-[var(--color-cream-200)]/60 text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-cream-200)]/40",
                )}
              >
                <p className="text-[0.8125rem] font-medium">{sec.label}</p>
                <p className="text-[0.6875rem] text-[var(--color-text-subtle)]">{sec.hint}</p>
              </button>
            ))}
          </nav>

          {/* Active section */}
          <div className="min-w-0">
            {section === "general" && (
              <Card className="space-y-5">
                <div>
                  <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">Salon identity</h2>
                  <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                    Name, contact info, and tagline. Leave a field blank to fall back to the built-in default.
                    Used in emails, SMS signatures, and (as we roll it out) across the public site.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Salon name"
                    value={s.brand_name ?? ""}
                    placeholder={brandingDefaults.name}
                    onChange={(e) => setS({ ...s, brand_name: e.target.value })}
                  />
                  <Input
                    label="Contact phone"
                    type="tel"
                    value={s.brand_phone ?? ""}
                    placeholder={brandingDefaults.phone}
                    onChange={(e) => setS({ ...s, brand_phone: e.target.value })}
                  />
                  <Input
                    label="Contact email"
                    type="email"
                    value={s.brand_email ?? ""}
                    placeholder={brandingDefaults.email}
                    onChange={(e) => setS({ ...s, brand_email: e.target.value })}
                  />
                  <Input
                    label="Street address"
                    value={s.brand_address ?? ""}
                    placeholder={brandingDefaults.address}
                    onChange={(e) => setS({ ...s, brand_address: e.target.value })}
                  />
                </div>
                <Textarea
                  label="Tagline"
                  rows={2}
                  value={s.brand_tagline ?? ""}
                  placeholder={brandingDefaults.tagline}
                  hint="Short one-liner shown under the salon name on public pages."
                  onChange={(e) => setS({ ...s, brand_tagline: e.target.value })}
                />
                <p className="text-[0.6875rem] text-[var(--color-text-subtle)] pt-1 border-t border-[var(--color-border)]">
                  Timezone · <span className="text-[var(--color-text-muted)]">America/Los_Angeles</span> (tied to server + cron schedules, not editable here).
                </p>
              </Card>
            )}

            {section === "booking" && (
              <Card className="space-y-5">
                <div>
                  <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">Deposit policy</h2>
                  <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                    Bookings at or above this duration require a deposit at checkout.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Trigger duration (minutes)"
                    type="number"
                    min={0}
                    value={s.long_appointment_min_minutes ?? "100"}
                    onChange={(e) => setS({ ...s, long_appointment_min_minutes: e.target.value })}
                  />
                  <Input
                    label="Deposit amount"
                    type="number"
                    min={0}
                    step={5}
                    value={depositDollars}
                    onChange={(e) => {
                      const dollars = parseFloat(e.target.value);
                      const cents = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
                      setS({ ...s, long_appointment_deposit_cents: String(cents) });
                    }}
                    prefix="$"
                    hint={`Stored as ${s.long_appointment_deposit_cents || "5000"}¢ (${formatMoney(parseInt(s.long_appointment_deposit_cents || "5000", 10), { from: "cents" })}).`}
                  />
                </div>
              </Card>
            )}

            {section === "notifications" && (
              <Card className="space-y-5">
                <div>
                  <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">Staff notification emails</h2>
                  <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                    One email per line or comma-separated. These receive every new-booking + new-contact-message alert.
                  </p>
                </div>
                {!(s.staff_notification_emails && s.staff_notification_emails.trim()) && (
                  <div className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-[0.75rem] text-[var(--color-warning)]">
                    No recipients saved — new bookings aren&apos;t triggering email alerts.
                  </div>
                )}
                <Textarea
                  rows={5}
                  value={s.staff_notification_emails || ""}
                  onChange={(e) => setS({ ...s, staff_notification_emails: e.target.value })}
                  placeholder="e.g. manager@example.com, receptionist@example.com"
                />
                <Checkbox
                  checked={truthy(s.booking_email_enabled)}
                  onCheckedChange={(v) => setS({ ...s, booking_email_enabled: v === true ? "true" : "false" })}
                  label="Send email alerts for new online bookings"
                />
              </Card>
            )}

            {section === "sms" && (
              <Card className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">SMS notifications</h2>
                    <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                      Requires TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER env vars. Trial Twilio
                      numbers can only text verified phones and stamp a &ldquo;Sent from a trial account&rdquo; prefix.
                    </p>
                  </div>
                  <Switch
                    checked={truthy(s.sms_enabled)}
                    onCheckedChange={(v) => setS({ ...s, sms_enabled: v === true ? "true" : "false" })}
                    label="Global"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    ["sms_booking_confirm_enabled",       "Booking confirmation"],
                    ["sms_booking_reminder_enabled",      "Day-before reminder"],
                    ["sms_booking_status_change_enabled", "Status changes"],
                    ["sms_booking_cancelled_enabled",     "Cancellation notice"],
                    ["sms_booking_reschedule_enabled",    "Reschedule notice"],
                    ["sms_staff_new_booking_enabled",     "Staff alert on new booking"],
                  ].map(([key, label]) => (
                    <label key={key} className={cn("flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--color-border)] cursor-pointer", !truthy(s.sms_enabled) && "opacity-60")}>
                      <Checkbox
                        checked={truthy(s[key as keyof Settings])}
                        disabled={!truthy(s.sms_enabled)}
                        onCheckedChange={(v) => setS({ ...s, [key]: v === true ? "true" : "false" })}
                      />
                      <span className="text-[0.8125rem]">{label}</span>
                    </label>
                  ))}
                </div>
                <Textarea
                  rows={2}
                  label="Staff SMS recipients (new-booking alert)"
                  hint="One per line or comma-separated. 10-digit US numbers default to +1."
                  value={s.staff_notification_sms_numbers || ""}
                  onChange={(e) => setS({ ...s, staff_notification_sms_numbers: e.target.value })}
                  placeholder="+18185551234, 8185550000"
                />
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <p className="text-[0.75rem] font-medium text-[var(--color-text)] mb-2">Test your Twilio config</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      label="Send test SMS to"
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+18185551234"
                      fieldClassName="min-w-[240px]"
                    />
                    <Button variant="secondary" size="md" onClick={sendTestSms} loading={testing}>
                      Send test SMS
                    </Button>
                  </div>
                  <p className="text-[0.6875rem] text-[var(--color-text-subtle)] mt-2">
                    Bypasses the global toggle but still respects opt-outs. Check the SMS log under Activity if it
                    doesn&apos;t arrive.
                  </p>
                </div>
              </Card>
            )}

            {section === "security" && (
              <Card className="space-y-5">
                <div>
                  <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">Session</h2>
                  <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                    How long an admin stays signed in when there&apos;s no activity. Server-side session TTL is
                    capped at 8 hours regardless.
                  </p>
                </div>
                <Input
                  label="Idle timeout (minutes)"
                  type="number"
                  min={5}
                  max={480}
                  value={s.idle_timeout_minutes ?? "480"}
                  onChange={(e) => setS({ ...s, idle_timeout_minutes: e.target.value })}
                  hint="Defaults to 480 min (8 h) — picks up on the next page load."
                />
              </Card>
            )}

            {/* Sticky save bar */}
            {dirty && (
              <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-raised)] px-4 py-3">
                <p className="text-[0.8125rem] text-[var(--color-text-muted)]">Unsaved changes</p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setS(initial)}>Discard</Button>
                  <Button variant="primary" size="sm" loading={saving} onClick={save}>Save changes</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
