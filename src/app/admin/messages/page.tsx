"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented, SegmentedList, SegmentedItem } from "@/components/ui/Tabs";
import { toast } from "@/components/ui/Toaster";

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string | null;
  created_at: string;
  read_at: string | null;
  // Manual spam flag (migration 20260507). null = use heuristic.
  is_spam: boolean | null;
}

// Client-side spam heuristic (used when is_spam is null). Matches
// community-standard contact-form spam signals: obvious payload
// keywords, URLs, length, all-caps names.
const SPAM_KEYWORDS = /(seo|backlinks?|ranking|crypto|bitcoin|loan|casino|viagra|escort|porn|http:\/\/|https:\/\/|www\.)/i;
function heuristicSpam(m: Message): boolean {
  const txt = `${m.name} ${m.message || ""}`;
  if (SPAM_KEYWORDS.test(txt)) return true;
  if ((m.message || "").length > 1500) return true;
  if (/^[A-Z ]{4,}$/.test(m.name)) return true;
  return false;
}

// Manual flag wins over heuristic when set.
function isSpam(m: Message): boolean {
  if (m.is_spam === true) return true;
  if (m.is_spam === false) return false;
  return heuristicSpam(m);
}

export default function MessagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "spam">("all");

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Failed to delete message.");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [status]);

  const spamCount = useMemo(() => messages.filter(isSpam).length, [messages]);
  const unreadCount = useMemo(
    () => messages.filter((m) => !isSpam(m) && !m.read_at).length,
    [messages],
  );
  const visible = useMemo(() => {
    if (filter === "spam") return messages.filter(isSpam);
    return messages.filter((m) => !isSpam(m));
  }, [filter, messages]);

  // Auto-mark read the first time an admin opens a message. Optimistic
  // update so the UI doesn't blink while the PATCH flies.
  const markRead = async (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read_at: m.read_at ?? new Date().toISOString() } : m)));
    try {
      await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      // If the PATCH fails, the next full load will reconcile.
    }
  };

  const openMessage = (msg: Message) => {
    const nextId = expandedId === msg.id ? null : msg.id;
    setExpandedId(nextId);
    if (nextId && !msg.read_at) markRead(msg.id);
  };

  // Optimistic manual-spam toggle. Sends `is_spam: true|false|null`
  // (null clears the override and falls back to the heuristic).
  const setSpam = async (id: string, value: boolean | null) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_spam: value } : m)));
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_spam: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update message.");
        // Best-effort rollback — reload the full list so we don't drift.
        const fresh = await fetch("/api/admin/messages").then((r) => r.json()).catch(() => null);
        if (Array.isArray(fresh)) setMessages(fresh);
        return;
      }
      toast.success(
        value === true ? "Marked as spam." :
        value === false ? "Moved back to inbox." :
        "Cleared manual flag.",
      );
    } catch {
      toast.error("Network error updating message.");
    }
  };

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl sm:text-3xl">Messages</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Contact form submissions</p>
        </div>
        <span className="text-sm font-body text-navy/40 shrink-0">{messages.length} total</span>
      </div>

      <div className="mb-4">
        <Segmented value={filter} onValueChange={(v) => setFilter(v as "all" | "spam")}>
          <SegmentedList>
            <SegmentedItem value="all">
              Inbox ({messages.length - spamCount})
              {unreadCount > 0 && (
                <span className="ml-1.5 text-[var(--color-crimson-600)] font-medium">· {unreadCount} unread</span>
              )}
            </SegmentedItem>
            <SegmentedItem value="spam">Spam ({spamCount})</SegmentedItem>
          </SegmentedList>
        </Segmented>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading messages...</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === "spam" ? "No spam" : "No messages yet"}
          description={
            filter === "spam"
              ? "Manually flagged messages and anything the spam heuristic catches will appear here."
              : "New contact-form submissions will show up here."
          }
        />
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {visible.map((msg) => {
            const spam = isSpam(msg);
            const manuallyFlagged = msg.is_spam === true;
            const heuristicOnly = spam && msg.is_spam !== true && msg.is_spam !== false;
            const isUnread = !msg.read_at;
            return (
              <div key={msg.id} className={"px-3 sm:px-6 py-4 " + (isUnread ? "bg-[var(--color-crimson-600)]/5" : "")}>
                <button
                  onClick={() => openMessage(msg)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnread && (
                          <span
                            className="h-2 w-2 rounded-full bg-[var(--color-crimson-600)] shrink-0"
                            aria-label="Unread"
                          />
                        )}
                        <p className={"font-body text-sm truncate " + (isUnread ? "font-bold" : "font-medium text-navy/70")}>{msg.name}</p>
                        {manuallyFlagged && <Badge tone="danger" size="sm">Spam</Badge>}
                        {heuristicOnly && <Badge tone="warning" size="sm">Spam?</Badge>}
                      </div>
                      <p className="text-navy/50 text-xs font-body break-words">
                        <span className="break-all">{msg.email}</span>
                        {msg.phone ? (
                          <>
                            <span className="hidden sm:inline"> | </span>
                            <span className="block sm:inline">{msg.phone}</span>
                          </>
                        ) : null}
                      </p>
                      {msg.service && (
                        <div className="mt-1">
                          <Badge tone="neutral" size="sm">{msg.service}</Badge>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-navy/40 font-body whitespace-nowrap">
                        {formatDate(msg.created_at, "long")}
                      </p>
                      <span className="text-navy/30 text-xs">{expandedId === msg.id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {msg.message && expandedId !== msg.id && (
                    <p className="text-navy/40 text-xs font-body mt-2 truncate">{msg.message}</p>
                  )}
                </button>

                {expandedId === msg.id && msg.message && (
                  <div className="mt-3 p-3 sm:p-4 bg-cream/50 border border-navy/5 rounded overflow-hidden">
                    <p className="text-sm font-body text-navy/70 whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {msg.message}
                    </p>
                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                      <a
                        href={`mailto:${msg.email}?subject=Re: Your inquiry at The Look Hair Salon`}
                        className="inline-flex items-center justify-center rounded-md font-medium tracking-[0.02em] transition-colors duration-150 whitespace-nowrap select-none h-8 px-3 text-[0.8125rem] gap-1.5 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-cream-50)]"
                      >
                        Reply by email
                      </a>
                      {msg.phone && (
                        <a
                          href={`tel:${msg.phone}`}
                          className="inline-flex items-center justify-center rounded-md font-medium tracking-[0.02em] transition-colors duration-150 whitespace-nowrap select-none h-8 px-3 text-[0.8125rem] gap-1.5 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-cream-50)]"
                        >
                          Call {msg.phone}
                        </a>
                      )}
                      {spam ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSpam(msg.id, false)}
                        >
                          Not spam
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSpam(msg.id, true)}
                        >
                          Mark as spam
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        className="sm:ml-auto"
                        onClick={() => handleDelete(msg.id)}
                        loading={deletingId === msg.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
