"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string | null;
  created_at: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">Messages</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Contact form submissions</p>
        </div>
        <span className="text-sm font-body text-navy/40">{messages.length} total</span>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No messages yet.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {messages.map((msg) => (
            <div key={msg.id} className="px-6 py-4">
              <button
                onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-body font-bold text-sm">{msg.name}</p>
                    <p className="text-navy/50 text-xs font-body">{msg.email}{msg.phone ? ` | ${msg.phone}` : ""}</p>
                    {msg.service && (
                      <span className="inline-block mt-1 text-xs bg-navy/5 text-navy/60 px-2 py-0.5 font-body">{msg.service}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-navy/40 font-body">{formatDate(msg.created_at)}</p>
                    <span className="text-navy/30 text-xs">{expandedId === msg.id ? "▲" : "▼"}</span>
                  </div>
                </div>
                {msg.message && expandedId !== msg.id && (
                  <p className="text-navy/40 text-xs font-body mt-2 truncate">{msg.message}</p>
                )}
              </button>

              {expandedId === msg.id && msg.message && (
                <div className="mt-3 p-4 bg-cream/50 border border-navy/5 rounded">
                  <p className="text-sm font-body text-navy/70 whitespace-pre-wrap">{msg.message}</p>
                  <div className="flex gap-3 mt-4">
                    <a
                      href={`mailto:${msg.email}?subject=Re: Your inquiry at The Look Hair Salon`}
                      className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1.5 hover:bg-blue-50"
                    >
                      Reply by email
                    </a>
                    {msg.phone && (
                      <a
                        href={`tel:${msg.phone}`}
                        className="text-xs font-body text-green-600 border border-green-200 px-3 py-1.5 hover:bg-green-50"
                      >
                        Call {msg.phone}
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(msg.id)}
                      disabled={deletingId === msg.id}
                      className="ml-auto text-xs font-body text-red-600 border border-red-200 px-3 py-1.5 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === msg.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
