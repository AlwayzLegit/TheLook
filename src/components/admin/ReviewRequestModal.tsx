"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { toast } from "@/components/ui/Toaster";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: {
    id: string;
    client_name: string;
    client_email: string;
    client_phone: string | null;
    sms_consent?: boolean | null;
  };
}

// Admin action: send review request via SMS + email. Loads the current
// templates from /api/admin/settings so the owner sees exactly what will
// go out, with every placeholder already rendered. Copy is editable;
// edits apply to this one send only. Final send fires
// POST /api/admin/appointments/{id}/send-review-request.

export default function ReviewRequestModal({ open, onOpenChange, appointment }: Props) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sms, setSms] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [reviewUrl, setReviewUrl] = useState("");

  const canSms = !!appointment.client_phone && appointment.sms_consent === true;
  const canEmail = !!appointment.client_email;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((raw) => {
        if (cancelled) return;
        const s = (raw ?? {}) as Record<string, string | undefined>;
        // Prefill with raw templates so the modal opens instantly; the
        // server interpolates placeholders at send time.
        setSms(s.review_request_sms_template || "");
        setEmailSubject(s.review_request_email_subject_template || "");
        setEmailBody(s.review_request_email_body_template || "");
        setReviewUrl(s.google_review_url || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    setSendSms(canSms);
    setSendEmail(canEmail);
    return () => { cancelled = true; };
  }, [open, canSms, canEmail]);

  const submit = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/admin/appointments/${appointment.id}/send-review-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sms,
          emailSubject,
          emailBody,
          channels: { sms: sendSms && canSms, email: sendEmail && canEmail },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Send failed.");
        return;
      }
      const parts: string[] = [];
      if (data.smsOk) parts.push("SMS sent");
      if (data.emailOk) parts.push("Email sent");
      if (parts.length === 0) parts.push("Queued with no deliverable channel");
      toast.success(parts.join(" · "));
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Send review request"
      description={`To ${appointment.client_name}${appointment.client_email ? ` · ${appointment.client_email}` : ""}${appointment.client_phone ? ` · ${appointment.client_phone}` : ""}`}
      size="lg"
    >
      {loading ? (
        <p className="text-[0.8125rem] text-[var(--color-text-muted)]">Loading templates…</p>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-cream-50)] text-[0.75rem] text-[var(--color-text-muted)]">
            <p>
              Placeholders are <strong>not</strong> interpolated in this preview — the server fills
              <code className="mx-1">{"{{client_name}}"}</code>,
              <code className="mx-1">{"{{service}}"}</code>,
              <code className="mx-1">{"{{stylist}}"}</code>,
              <code className="mx-1">{"{{review_url}}"}</code>
              {" "}before sending.
            </p>
            {reviewUrl && (
              <p className="mt-1 break-all">
                Review URL · <a href={reviewUrl} target="_blank" rel="noreferrer" className="text-[var(--color-crimson-600)] underline">{reviewUrl}</a>
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-[0.8125rem]">
            <label className={"flex items-center gap-2 " + (canSms ? "" : "opacity-50")}>
              <Checkbox checked={sendSms && canSms} disabled={!canSms} onCheckedChange={(v) => setSendSms(!!v)} />
              Send SMS {canSms ? "" : "(no consent or phone on file)"}
            </label>
            <label className={"flex items-center gap-2 " + (canEmail ? "" : "opacity-50")}>
              <Checkbox checked={sendEmail && canEmail} disabled={!canEmail} onCheckedChange={(v) => setSendEmail(!!v)} />
              Send email {canEmail ? "" : "(no email on file)"}
            </label>
          </div>

          {canSms && (
            <div>
              <Textarea
                label="SMS message"
                rows={3}
                value={sms}
                onChange={(e) => setSms(e.target.value)}
                hint={`${sms.length} chars`}
              />
            </div>
          )}

          {canEmail && (
            <div className="space-y-3">
              <Input
                label="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <Textarea
                label="Email body"
                rows={8}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              loading={sending}
              disabled={!sendSms && !sendEmail}
            >
              Send review request
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
