"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";
import { estimateSmsCost } from "@/lib/smsLength";

// Bulk broadcast — send an SMS or email to a filtered audience. Two
// safety gates prevent accidental blasts:
//   1. Pre-flight call (GET /api/admin/broadcast?...) shows audience
//      size + per-SMS segment count before the confirm button enables.
//   2. Server caps eligible sends at 500 unless the client explicitly
//      overrides via `limit` (not surfaced in this UI — it's a seatbelt).

interface ServiceOpt {
  id: string;
  name: string;
  category: string;
}

interface Preflight {
  audienceSize: number;
  eligibleCount: number;
  cost: {
    segments: number;
    length: number;
    encoding: "gsm7" | "ucs2";
    capPerSegment: number;
  } | null;
}

export default function BroadcastPage() {
  const { status } = useSession();
  const router = useRouter();

  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [segment, setSegment] = useState<"all" | "active_6mo" | "service">("all");
  const [serviceId, setServiceId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/admin/services")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list = (Array.isArray(rows) ? rows : []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.active !== false,
        );
        setServices(list);
      })
      .catch(() => {});
  }, []);

  // Debounced pre-flight — re-run audience + cost whenever segment or
  // message meaningfully changes so the confirm button shows a live count.
  useEffect(() => {
    if (!message.trim()) {
      setPreflight(null);
      return;
    }
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({
        channel,
        segment,
        message,
      });
      if (segment === "service" && serviceId) params.set("serviceId", serviceId);
      if (subject) params.set("subject", subject);
      try {
        const res = await fetch(`/api/admin/broadcast?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setPreflight(data);
      } catch {
        // swallow — preflight errors surface on the send attempt instead
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [channel, segment, serviceId, subject, message]);

  const localSmsCost = useMemo(() => (message.trim() ? estimateSmsCost(message) : null), [message]);

  const disabled =
    sending ||
    !message.trim() ||
    (channel === "email" && !subject.trim()) ||
    (segment === "service" && !serviceId) ||
    (preflight?.eligibleCount ?? 0) === 0;

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          segment,
          serviceId: segment === "service" ? serviceId : undefined,
          subject: channel === "email" ? subject : undefined,
          message,
          confirm: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Broadcast failed.");
        return;
      }
      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setConfirmOpen(false);
      toast.success("Broadcast sent", {
        description: `${data.sent ?? 0} delivered, ${data.failed ?? 0} failed`,
      });
    } finally {
      setSending(false);
    }
  };

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Eyebrow>Broadcast</Eyebrow>
        <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">
          Send a message to clients
        </h1>
        <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2">
          One-off SMS or email to a segment of your clients — closure notices,
          promos, stylist updates. SMS goes only to clients who opted in;
          email goes to everyone with an address on file. Write once, preview,
          confirm.
        </p>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-md p-5 space-y-5">
        <Select label="Channel" value={channel} onChange={(e) => setChannel(e.target.value as "sms" | "email")}>
          <option value="sms">SMS (opted-in clients only)</option>
          <option value="email">Email</option>
        </Select>

        <Select
          label="Audience"
          value={segment}
          onChange={(e) => setSegment(e.target.value as "all" | "active_6mo" | "service")}
        >
          <option value="all">All clients with {channel === "sms" ? "a phone + SMS consent" : "an email on file"}</option>
          <option value="active_6mo">Clients active in the last 6 months</option>
          <option value="service">Clients who&apos;ve booked a specific service</option>
        </Select>

        {segment === "service" && (
          <Select
            label="Service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">— Pick a service —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.category} · {s.name}
              </option>
            ))}
          </Select>
        )}

        {channel === "email" && (
          <Input
            label="Subject *"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="We'll be closed Sunday for staff training"
          />
        )}

        <div>
          <Textarea
            label="Message *"
            rows={channel === "email" ? 10 : 5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              channel === "sms"
                ? "Hi {{client_name}} — short note from {{salon_name}}. ..."
                : "Hi {{client_name}},\n\nJust a heads-up that ..."
            }
          />
          <p className="text-[0.7rem] font-mono mt-1 text-[var(--color-text-subtle)]">
            Placeholders: <code>{"{{client_name}}"}</code> · <code>{"{{salon_name}}"}</code>
          </p>
          {channel === "sms" && localSmsCost && (
            <p
              className={`text-[0.7rem] font-mono mt-1 ${
                localSmsCost.segments > 1 ? "text-amber-700" : "text-[var(--color-text-subtle)]"
              }`}
            >
              {localSmsCost.segments} segment{localSmsCost.segments === 1 ? "" : "s"} ·{" "}
              {localSmsCost.length}/{localSmsCost.capPerSegment} chars
              {localSmsCost.segments > 1 ? " · each recipient will receive multiple SMS" : ""}
            </p>
          )}
        </div>

        {preflight && (
          <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] rounded px-4 py-3 text-sm font-body">
            <p>
              <strong>{preflight.eligibleCount}</strong> of{" "}
              <strong>{preflight.audienceSize}</strong> clients in this segment will receive
              the message.
            </p>
            {channel === "sms" && preflight.cost && (
              <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-1">
                Estimated {preflight.eligibleCount * preflight.cost.segments} total SMS
                segments sent.
              </p>
            )}
            {preflight.eligibleCount === 0 && (
              <p className="text-[0.75rem] text-red-700 mt-1">
                Nobody in this segment has{" "}
                {channel === "sms" ? "a phone + SMS consent" : "an email on file"}. Pick a
                different audience.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" aria-live="polite" className="text-red-600 text-sm font-body">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button variant="primary" size="md" disabled={disabled} onClick={() => setConfirmOpen(true)}>
            Review &amp; send
          </Button>
        </div>
      </div>

      {/* Confirm modal — forces a second look before the API fires. */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm broadcast"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !sending && setConfirmOpen(false)}
        >
          <div
            className="bg-white max-w-md w-full rounded-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-heading text-lg">Send this broadcast?</h2>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm font-body">
              <p>
                This will {channel === "sms" ? "text" : "email"}{" "}
                <strong>{preflight?.eligibleCount ?? 0}</strong> clients right now.
              </p>
              {channel === "email" && (
                <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] p-3 rounded">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Subject</p>
                  <p>{subject}</p>
                </div>
              )}
              <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] p-3 rounded whitespace-pre-wrap">
                {message}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Placeholders render with each recipient&apos;s name and your salon name at send.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2 bg-[var(--color-cream-50)]">
              <Button variant="secondary" size="md" onClick={() => setConfirmOpen(false)} disabled={sending}>
                Back
              </Button>
              <Button variant="primary" size="md" onClick={handleSend} disabled={sending}>
                {sending ? "Sending…" : "Send now"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5 bg-green-50 border border-green-200 rounded p-4 text-sm font-body">
          Broadcast complete. <strong>{result.sent}</strong> delivered, {result.failed} failed.
        </div>
      )}
    </div>
  );
}
