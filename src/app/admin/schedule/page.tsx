"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const loadRules = () => {
    fetch("/api/admin/schedule")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRules(data));
  };

  useEffect(() => {
    if (status === "authenticated") loadRules();
  }, [status]);

  const addClosure = async () => {
    if (!newDate) return;
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleType: "override",
        specificDate: newDate,
        isClosed: true,
        note: newNote || "Closed",
      }),
    });
    setNewDate("");
    setNewNote("");
    loadRules();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/admin/schedule?id=${id}`, { method: "DELETE" });
    loadRules();
  };

  if (status !== "authenticated") return null;

  const weeklyRules = rules.filter((r) => r.ruleType === "weekly" && !r.stylistId);
  const overrides = rules.filter((r) => r.ruleType === "override");

  return (
    <div className="p-8">
      <h1 className="font-heading text-3xl mb-6">Schedule</h1>

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
        <button onClick={addClosure} className="bg-rose text-white text-sm font-body px-4 py-2 hover:bg-rose-light transition-colors">
          Add Closure
        </button>
      </div>

      {overrides.length === 0 ? (
        <p className="text-navy/40 font-body text-sm">No overrides scheduled.</p>
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {overrides.map((rule) => (
            <div key={rule.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="font-body text-sm">{rule.specificDate}</p>
                <p className="text-navy/40 text-xs font-body">{rule.note}</p>
              </div>
              <button onClick={() => deleteRule(rule.id)} className="text-red-500 text-xs font-body hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
