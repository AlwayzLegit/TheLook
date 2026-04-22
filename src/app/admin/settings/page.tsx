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
  sms_enabled?: string;
  sms_booking_confirm_enabled?: string;
  sms_booking_reminder_enabled?: string;
  sms_booking_status_change_enabled?: string;
  sms_booking_cancelled_enabled?: string;
  sms_booking_reschedule_enabled?: string;
  sms_staff_new_booking_enabled?: string;
  sms_review_request_enabled?: string;
  reminder_sms_template?: string;
  reminder_email_subject_template?: string;
  reminder_email_body_template?: string;
  review_request_sms_template?: string;
  review_request_email_subject_template?: string;
  review_request_email_body_template?: string;
  google_review_url?: string;
  idle_timeout_minutes?: string;
  brand_name?: string;
  brand_tagline?: string;
  brand_address?: string;
  brand_phone?: string;
  brand_email?: string;
}

interface DepositRule {
  id: string;
  name: string;
  trigger_type: "min_price_cents" | "min_duration_minutes";
  trigger_value: number;
  deposit_cents: number;
  active: boolean;
  sort_order: number;
}

const truthy = (v: string | undefined, fallback = "true") => ((v ?? fallback) === "true");

type Section = "general" | "booking" | "reminders" | "notifications" | "sms" | "security";
const SECTIONS: Array<{ id: Section; label: string; hint: string }> = [
  { id: "general",       label: "General",       hint: "Salon details used across the site." },
  { id: "booking",       label: "Booking",       hint: "Deposit rules + booking behaviour." },
  { id: "reminders",     label: "Reminders",     hint: "Day-of reminder + review-request templates." },
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

            {section === "booking" && <DepositRulesCard />}

            {section === "reminders" && (
              <Card className="space-y-6">
                <div>
                  <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">Day-of reminder</h2>
                  <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                    Sent daily at 8am PT to every confirmed or completed appointment on that date.
                    SMS goes only to clients who opted in; email goes to everyone with an address.
                  </p>
                  <p className="text-[0.75rem] text-[var(--color-text-subtle)] mt-1">
                    Placeholders: <code>{"{{client_name}}"}</code> · <code>{"{{service}}"}</code> · <code>{"{{stylist}}"}</code> · <code>{"{{time}}"}</code> · <code>{"{{date}}"}</code> · <code>{"{{cancel_url}}"}</code>
                  </p>
                </div>
                <Textarea
                  label="SMS body"
                  rows={3}
                  value={s.reminder_sms_template ?? ""}
                  onChange={(e) => setS({ ...s, reminder_sms_template: e.target.value })}
                />
                <Input
                  label="Email subject"
                  value={s.reminder_email_subject_template ?? ""}
                  onChange={(e) => setS({ ...s, reminder_email_subject_template: e.target.value })}
                />
                <Textarea
                  label="Email body"
                  rows={8}
                  value={s.reminder_email_body_template ?? ""}
                  onChange={(e) => setS({ ...s, reminder_email_body_template: e.target.value })}
                />

                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">Review request</h2>
                  <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                    Sent manually from a completed appointment&apos;s actions menu.
                  </p>
                  <p className="text-[0.75rem] text-[var(--color-text-subtle)] mt-1">
                    Placeholders: <code>{"{{client_name}}"}</code> · <code>{"{{service}}"}</code> · <code>{"{{stylist}}"}</code> · <code>{"{{review_url}}"}</code>
                  </p>
                </div>
                <Input
                  label="Google review URL"
                  value={s.google_review_url ?? ""}
                  onChange={(e) => setS({ ...s, google_review_url: e.target.value })}
                  hint="The link clients land on. Grab the short ‘write a review’ link from your Google Business Profile for best results."
                />
                <Textarea
                  label="SMS body"
                  rows={3}
                  value={s.review_request_sms_template ?? ""}
                  onChange={(e) => setS({ ...s, review_request_sms_template: e.target.value })}
                />
                <Input
                  label="Email subject"
                  value={s.review_request_email_subject_template ?? ""}
                  onChange={(e) => setS({ ...s, review_request_email_subject_template: e.target.value })}
                />
                <Textarea
                  label="Email body"
                  rows={8}
                  value={s.review_request_email_body_template ?? ""}
                  onChange={(e) => setS({ ...s, review_request_email_body_template: e.target.value })}
                />
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

// ─── Deposit rules card ────────────────────────────────────────────
// Stand-alone section with its own load / save so the existing Settings
// dirty-check doesn't have to track a rules array. Every change hits the
// server immediately and refreshes the local copy.

const TRIGGER_LABELS: Record<DepositRule["trigger_type"], string> = {
  min_price_cents: "Booking total ≥",
  min_duration_minutes: "Duration ≥",
};

function formatTrigger(r: DepositRule): string {
  if (r.trigger_type === "min_price_cents") return `$${(r.trigger_value / 100).toFixed(0)}`;
  return `${r.trigger_value} min`;
}

function DepositRulesCard() {
  const [rules, setRules] = useState<DepositRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [editing, setEditing] = useState<DepositRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    trigger_type: DepositRule["trigger_type"];
    trigger_value: string;
    deposit_dollars: string;
    active: boolean;
  }>({ name: "", trigger_type: "min_price_cents", trigger_value: "100", deposit_dollars: "50", active: true });

  const load = () => {
    setLoadingRules(true);
    fetch("/api/admin/deposit-rules")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .finally(() => setLoadingRules(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", trigger_type: "min_price_cents", trigger_value: "100", deposit_dollars: "50", active: true });
    setShowForm(true);
  };

  const openEdit = (r: DepositRule) => {
    setEditing(r);
    setForm({
      name: r.name,
      trigger_type: r.trigger_type,
      trigger_value: r.trigger_type === "min_price_cents"
        ? String(Math.round(r.trigger_value / 100))
        : String(r.trigger_value),
      deposit_dollars: String(Math.round(r.deposit_cents / 100)),
      active: r.active,
    });
    setShowForm(true);
  };

  const save = async () => {
    const triggerNum = parseInt(form.trigger_value, 10);
    const depositNum = parseInt(form.deposit_dollars, 10);
    if (!form.name.trim()) { toast.error("Give the rule a name."); return; }
    if (!Number.isFinite(triggerNum) || triggerNum < 0) { toast.error("Trigger value must be a positive number."); return; }
    if (!Number.isFinite(depositNum) || depositNum < 0) { toast.error("Deposit amount must be a positive number."); return; }

    const payload = {
      name: form.name.trim(),
      trigger_type: form.trigger_type,
      trigger_value: form.trigger_type === "min_price_cents" ? triggerNum * 100 : triggerNum,
      deposit_cents: depositNum * 100,
      active: form.active,
    };

    const url = editing ? `/api/admin/deposit-rules/${editing.id}` : "/api/admin/deposit-rules";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editing ? "Rule updated." : "Rule added.");
      setShowForm(false);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Failed to save rule.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this deposit rule?")) return;
    const res = await fetch(`/api/admin/deposit-rules/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Rule deleted."); load(); }
    else toast.error("Failed to delete rule.");
  };

  const toggle = async (r: DepositRule) => {
    const res = await fetch(`/api/admin/deposit-rules/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    if (res.ok) load();
    else toast.error("Failed to toggle rule.");
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[1.0625rem] font-medium text-[var(--color-text)]">Deposit rules</h2>
          <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
            Any active rule that matches a booking forces a deposit. If several rules match, the
            highest deposit wins. No rules = no deposit ever required.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openNew}>+ Add Rule</Button>
      </div>

      {loadingRules ? (
        <Skeleton className="h-20 w-full" />
      ) : rules.length === 0 ? (
        <p className="text-[0.8125rem] text-[var(--color-text-muted)] italic">
          No deposit rules configured. Clients can book any service without paying up-front.
        </p>
      ) : (
        <div className="border border-[var(--color-border)] rounded-md divide-y divide-[var(--color-border)]">
          {rules.map((r) => (
            <div key={r.id} className={cn("px-4 py-3 flex items-center justify-between gap-4", !r.active && "opacity-60")}>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-medium text-[var(--color-text)] truncate">{r.name}</p>
                <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                  {TRIGGER_LABELS[r.trigger_type]} <strong>{formatTrigger(r)}</strong>
                  {" → "}
                  Deposit <strong>{formatMoney(r.deposit_cents, { from: "cents" })}</strong>
                  {!r.active && " · inactive"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={r.active} onCheckedChange={() => toggle(r)} />
                <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => remove(r.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border border-[var(--color-border)] rounded-md p-4 space-y-4 bg-[var(--color-cream-50)]">
          <Eyebrow>{editing ? "Edit rule" : "New rule"}</Eyebrow>
          <Input
            label="Rule name"
            placeholder="e.g. Bookings priced over $100"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-text-subtle)] mb-1.5">
                Trigger type
              </label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm({ ...form, trigger_type: e.target.value as DepositRule["trigger_type"] })}
                className="w-full h-10 px-3 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[0.8125rem]"
              >
                <option value="min_price_cents">Total price ≥</option>
                <option value="min_duration_minutes">Total duration ≥</option>
              </select>
            </div>
            <Input
              label={form.trigger_type === "min_price_cents" ? "Trigger ($)" : "Trigger (min)"}
              type="number"
              min={0}
              value={form.trigger_value}
              onChange={(e) => setForm({ ...form, trigger_value: e.target.value })}
              prefix={form.trigger_type === "min_price_cents" ? "$" : undefined}
            />
            <Input
              label="Deposit amount"
              type="number"
              min={0}
              step={5}
              value={form.deposit_dollars}
              onChange={(e) => setForm({ ...form, deposit_dollars: e.target.value })}
              prefix="$"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} id="rule-active" />
            <label htmlFor="rule-active" className="text-[0.8125rem] text-[var(--color-text)] cursor-pointer">
              Active
            </label>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save}>
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
