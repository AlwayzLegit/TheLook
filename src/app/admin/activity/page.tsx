"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ActivityEntry {
  id: string;
  action: string;
  details: string | null;
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

function parseDetails(details: string | null): string {
  if (!details) return "";
  try {
    const parsed = JSON.parse(details);
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }
    return String(parsed);
  } catch {
    return details;
  }
}

export default function ActivityPage() {
  const { status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/admin/activity")
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">Activity Log</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Recent admin actions</p>
        </div>
        <span className="text-sm font-body text-navy/40">{entries.length} entries</span>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading activity...</p>
      ) : entries.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No activity recorded yet.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {entries.map((entry) => (
            <div key={entry.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-body font-bold text-sm">{entry.action}</p>
                  {entry.details && (
                    <p className="text-navy/50 text-xs font-body mt-1">
                      {parseDetails(entry.details)}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-navy/40 font-body">{formatDate(entry.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
