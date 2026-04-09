"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Rule {
  id: string;
  stylistId: string | null;
  ruleType: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isClosed: number | null;
  note: string | null;
}

export default function SchedulePage() {
  const { status } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isClosedOverride, setIsClosedOverride] = useState(true);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch("/api/admin/schedule");
      if (!r.ok) {
        setError("Failed to load schedule.");
        return;
      }
      const text = await r.text();
      if (!text) {
        setRules([]);
        return;
      }
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        setRules(data);
      } else {
        setError("Invalid schedule response.");
      }
    } catch {
      setError("Failed to load schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") loadRules();
  }, [status]);

  const addClosure = async () => {
    if (!newDate) return;
    if (!isClosedOverride && !newStartTime) {
      setError("Start time is required for open override.");
      return;
    }
    if (!isClosedOverride && !newEndTime) {
      setError("End time is required for open override.");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleType: "override",
          specificDate: newDate,
          isClosed: isClosedOverride,
          startTime: isClosedOverride ? null : newStartTime,
          endTime: isClosedOverride ? null : newEndTime,
          note: newNote || (isClosedOverride ? "Closed" : "Special hours"),
        }),
      });
      if (!res.ok) {
        setError("Failed to add override.");
        setToast({ type: "error", message: "Failed to save override." });
        return;
      }
      setNewDate("");
      setNewNote("");
      setToast({ type: "success", message: "Override saved." });
      loadRules();
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/schedule?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to remove rule.");
        setToast({ type: "error", message: "Failed to remove rule." });
        return;
      }
      setToast({ type: "success", message: "Rule removed." });
      loadRules();
    } finally {
      setDeletingId(null);
    }
  };

  if (status !== "authenticated") return null;

  const weeklyRules = rules.filter((r) => r.ruleType === "weekly" && !r.stylistId);
  const overrides = rules.filter((r) => r.ruleType === "override");

  return (
    <div className="p-8">
      <h1 className="font-heading text-3xl mb-6">Schedule</h1>
      {error ? (
        <p className="mb-4 text-sm font-body text-red-600">{error}</p>
      ) : null}

      <h2 className="font-heading text-xl mb-4">Regular Hours</h2>
      <div className="bg-white border border-navy/10 divide-y divide-navy/5 mb-10">
        {weeklyRules
          .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0))
          .map((rule) => (
            <div key={rule.id} className="px-6 py-3 flex justify-between items-center">
              <span className="font-body text-sm">{DAYS[rule.dayOfWeek ?? 0]}</span>
              <span className={`font-body text-sm ${rule.isClosed ? "text-red-500" : ""}`}>
                {rule.isClosed ? "CLOSED" : `${rule.startTime} – ${rule.endTime}`}
              </span>
            </div>
          ))}
      </div>

      <h2 className="font-heading text-xl mb-4">Closures &amp; Overrides</h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body" />
        <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Reason (e.g. Holiday)" className="border border-navy/20 px-3 py-2 text-sm font-body" />
        <select
          value={isClosedOverride ? "closed" : "open"}
          onChange={(e) => setIsClosedOverride(e.target.value === "closed")}
          className="border border-navy/20 px-3 py-2 text-sm font-body"
        >
          <option value="closed">Closed</option>
          <option value="open">Open (special hours)</option>
        </select>
        {!isClosedOverride ? (
          <>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="border border-navy/20 px-3 py-2 text-sm font-body"
            />
            <input
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="border border-navy/20 px-3 py-2 text-sm font-body"
            />
          </>
        ) : null}
        <button
          onClick={addClosure}
          disabled={saving}
          className="bg-rose text-white text-sm font-body px-4 py-2 hover:bg-rose-light transition-colors disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Override"}
        </button>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading schedule...</p>
      ) : overrides.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No overrides scheduled.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {overrides.map((rule) => (
            <div key={rule.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="font-body text-sm">{rule.specificDate}</p>
                <p className="text-navy/40 text-xs font-body">
                  {rule.isClosed ? "Closed" : `${rule.startTime} - ${rule.endTime}`}
                  {rule.note ? ` - ${rule.note}` : ""}
                </p>
              </div>
              <button
                onClick={() => deleteRule(rule.id)}
                disabled={deletingId === rule.id}
                className="text-red-500 text-xs font-body hover:underline disabled:opacity-60"
              >
                {deletingId === rule.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
      {toast ? (
        <AdminToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
