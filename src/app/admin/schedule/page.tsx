"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Rule {
  id: string;
  stylistId: string | null;
  ruleType: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean | number | null;
  note: string | null;
}

interface Stylist {
  id: string;
  name: string;
}

export default function SchedulePage() {
  const { status } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Weekly rule editing
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editDayStart, setEditDayStart] = useState("10:00");
  const [editDayEnd, setEditDayEnd] = useState("18:00");
  const [editDayClosed, setEditDayClosed] = useState(false);
  const [editDayStylist, setEditDayStylist] = useState("");

  // Override form
  const [overrideMode, setOverrideMode] = useState<"single" | "range">("single");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideDateEnd, setOverrideDateEnd] = useState("");
  const [overrideClosed, setOverrideClosed] = useState(true);
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideStylist, setOverrideStylist] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/schedule");
      if (!r.ok) return;
      const data = await r.json();
      if (Array.isArray(data)) setRules(data);
    } finally {
      setLoading(false);
    }
  };

  const loadStylists = async () => {
    const r = await fetch("/api/admin/stylists");
    if (!r.ok) return;
    const data = await r.json();
    if (Array.isArray(data)) setStylists(data);
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadRules();
      loadStylists();
    }
  }, [status]);

  const saveRule = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to save rule." });
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/schedule?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to remove rule." });
        return;
      }
      setToast({ type: "success", message: "Rule removed." });
      loadRules();
    } finally {
      setDeletingId(null);
    }
  };

  // --- Weekly rule save ---
  const saveWeeklyRule = async () => {
    if (editingDay === null) return;

    // Delete existing rule for this day+stylist first
    const existing = rules.find(
      (r) =>
        r.ruleType === "weekly" &&
        r.dayOfWeek === editingDay &&
        (editDayStylist ? r.stylistId === editDayStylist : !r.stylistId)
    );
    if (existing) {
      await fetch(`/api/admin/schedule?id=${existing.id}`, { method: "DELETE" });
    }

    const ok = await saveRule({
      ruleType: "weekly",
      dayOfWeek: editingDay,
      stylistId: editDayStylist || null,
      isClosed: editDayClosed,
      startTime: editDayClosed ? null : editDayStart,
      endTime: editDayClosed ? null : editDayEnd,
      note: null,
    });

    if (ok) {
      setToast({ type: "success", message: `${DAYS[editingDay]} hours updated.` });
      setEditingDay(null);
      loadRules();
    }
  };

  // --- Override save (single or range) ---
  const saveOverride = async () => {
    if (!overrideDate) return;
    if (!overrideClosed && (!overrideStart || !overrideEnd)) {
      setToast({ type: "error", message: "Start and end time required for special hours." });
      return;
    }

    const dates: string[] = [];
    if (overrideMode === "range" && overrideDateEnd && overrideDateEnd >= overrideDate) {
      const start = new Date(overrideDate + "T00:00:00");
      const end = new Date(overrideDateEnd + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }
    } else {
      dates.push(overrideDate);
    }

    setSaving(true);
    let allOk = true;
    for (const date of dates) {
      const ok = await saveRule({
        ruleType: "override",
        specificDate: date,
        stylistId: overrideStylist || null,
        isClosed: overrideClosed,
        startTime: overrideClosed ? null : overrideStart,
        endTime: overrideClosed ? null : overrideEnd,
        note: overrideNote || (overrideClosed ? "Closed" : "Special hours"),
      });
      if (!ok) allOk = false;
    }
    setSaving(false);

    if (allOk) {
      setToast({
        type: "success",
        message: dates.length > 1 ? `${dates.length} days saved.` : "Override saved.",
      });
      setOverrideDate("");
      setOverrideDateEnd("");
      setOverrideNote("");
      loadRules();
    }
  };

  const openEditDay = (day: number, stylistId?: string) => {
    const existing = rules.find(
      (r) =>
        r.ruleType === "weekly" &&
        r.dayOfWeek === day &&
        (stylistId ? r.stylistId === stylistId : !r.stylistId)
    );
    setEditingDay(day);
    setEditDayStylist(stylistId || "");
    if (existing) {
      setEditDayClosed(!!existing.isClosed);
      setEditDayStart(existing.startTime || "10:00");
      setEditDayEnd(existing.endTime || "18:00");
    } else {
      setEditDayClosed(false);
      setEditDayStart("10:00");
      setEditDayEnd("18:00");
    }
  };

  if (status !== "authenticated") return null;

  const salonWeekly = rules
    .filter((r) => r.ruleType === "weekly" && !r.stylistId)
    .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0));

  const overrides = rules
    .filter((r) => r.ruleType === "override")
    .sort((a, b) => (a.specificDate || "").localeCompare(b.specificDate || ""));

  const stylistWeekly = rules.filter((r) => r.ruleType === "weekly" && r.stylistId);

  const getStylistName = (id: string | null) =>
    stylists.find((s) => s.id === id)?.name || "Unknown";

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-heading text-3xl mb-8">Schedule</h1>

      {/* ───── SECTION 1: Salon Weekly Hours ───── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl">Salon Hours</h2>
          <p className="text-xs text-navy/40 font-body">Click a day to edit</p>
        </div>
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {DAYS.map((dayName, dayIndex) => {
            const rule = salonWeekly.find((r) => r.dayOfWeek === dayIndex);
            const isClosed = rule ? !!rule.isClosed : dayIndex === 2;
            const hours = rule
              ? `${rule.startTime} – ${rule.endTime}`
              : dayIndex === 2
                ? ""
                : "10:00 – 18:00";

            return (
              <div key={dayIndex}>
                <button
                  onClick={() => openEditDay(dayIndex)}
                  className="w-full px-6 py-3 flex justify-between items-center hover:bg-navy/3 transition-colors text-left"
                >
                  <span className="font-body text-sm">{dayName}</span>
                  <span className={`font-body text-sm ${isClosed ? "text-red-500" : "text-navy/70"}`}>
                    {isClosed ? "CLOSED" : hours}
                    {!rule && <span className="text-navy/30 text-xs ml-2">(default)</span>}
                  </span>
                </button>

                {/* Inline edit form */}
                {editingDay === dayIndex && !editDayStylist && (
                  <div className="px-6 py-4 bg-cream/50 border-t border-navy/5">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editDayClosed}
                          onChange={(e) => setEditDayClosed(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-body">Closed</span>
                      </label>
                      {!editDayClosed && (
                        <>
                          <input type="time" value={editDayStart} onChange={(e) => setEditDayStart(e.target.value)} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                          <span className="text-navy/40">to</span>
                          <input type="time" value={editDayEnd} onChange={(e) => setEditDayEnd(e.target.value)} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                        </>
                      )}
                      <button onClick={saveWeeklyRule} disabled={saving} className="bg-navy text-white text-xs font-body px-4 py-2 hover:bg-navy/90 disabled:opacity-60">
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditingDay(null)} className="text-xs font-body text-navy/50 hover:text-navy px-3 py-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ───── SECTION 2: Stylist-Specific Hours ───── */}
      {stylists.length > 0 && (
        <div className="mb-10">
          <h2 className="font-heading text-xl mb-2">Stylist-Specific Hours</h2>
          <p className="text-navy/40 text-xs font-body mb-4">
            Set different hours for individual stylists. Overrides salon hours for that stylist.
          </p>

          {stylistWeekly.length > 0 && (
            <div className="bg-white border border-navy/10 divide-y divide-navy/5 mb-4">
              {stylistWeekly.map((rule) => (
                <div key={rule.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-body text-sm">
                      <span className="font-bold">{getStylistName(rule.stylistId)}</span>
                      {" — "}
                      {DAYS[rule.dayOfWeek ?? 0]}
                    </p>
                    <p className="text-navy/40 text-xs font-body">
                      {rule.isClosed ? "Closed" : `${rule.startTime} – ${rule.endTime}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(rule.id)}
                    disabled={deletingId === rule.id}
                    className="text-red-500 text-xs font-body hover:underline disabled:opacity-60"
                  >
                    {deletingId === rule.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-cream/50 border border-navy/10 p-4">
            <p className="text-xs font-body text-navy/50 mb-3">Add stylist-specific hours:</p>
            <div className="flex flex-wrap items-center gap-3">
              <select value={editDayStylist} onChange={(e) => setEditDayStylist(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body">
                <option value="">Select stylist</option>
                {stylists.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={editingDay !== null && editDayStylist ? String(editingDay) : ""}
                onChange={(e) => {
                  const day = parseInt(e.target.value);
                  if (!isNaN(day)) openEditDay(day, editDayStylist);
                }}
                className="border border-navy/20 px-3 py-2 text-sm font-body"
              >
                <option value="">Select day</option>
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editDayClosed} onChange={(e) => setEditDayClosed(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-body">Closed</span>
              </label>
              {!editDayClosed && (
                <>
                  <input type="time" value={editDayStart} onChange={(e) => setEditDayStart(e.target.value)} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                  <span className="text-navy/40 text-sm">to</span>
                  <input type="time" value={editDayEnd} onChange={(e) => setEditDayEnd(e.target.value)} className="border border-navy/20 px-2 py-1.5 text-sm font-body" />
                </>
              )}
              <button
                onClick={() => {
                  if (!editDayStylist || editingDay === null) {
                    setToast({ type: "error", message: "Select a stylist and day." });
                    return;
                  }
                  saveWeeklyRule();
                }}
                disabled={saving || !editDayStylist}
                className="bg-navy text-white text-xs font-body px-4 py-2 hover:bg-navy/90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── SECTION 3: Closures & Overrides ───── */}
      <div className="mb-10">
        <h2 className="font-heading text-xl mb-2">Closures &amp; Overrides</h2>
        <p className="text-navy/40 text-xs font-body mb-4">
          Close for holidays, vacations, or set special hours for specific dates.
        </p>

        <div className="bg-cream/50 border border-navy/10 p-4 mb-6">
          {/* Mode toggle */}
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="overrideMode" checked={overrideMode === "single"} onChange={() => setOverrideMode("single")} className="w-4 h-4" />
              <span className="text-sm font-body">Single day</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="overrideMode" checked={overrideMode === "range"} onChange={() => setOverrideMode("range")} className="w-4 h-4" />
              <span className="text-sm font-body">Date range (vacation)</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-body text-navy/40 mb-1">
                {overrideMode === "range" ? "From" : "Date"}
              </label>
              <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body" />
            </div>
            {overrideMode === "range" && (
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">To</label>
                <input type="date" value={overrideDateEnd} onChange={(e) => setOverrideDateEnd(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
            )}
            <div>
              <label className="block text-xs font-body text-navy/40 mb-1">Type</label>
              <select value={overrideClosed ? "closed" : "open"} onChange={(e) => setOverrideClosed(e.target.value === "closed")} className="border border-navy/20 px-3 py-2 text-sm font-body">
                <option value="closed">Closed</option>
                <option value="open">Special hours</option>
              </select>
            </div>
            {!overrideClosed && (
              <>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Open</label>
                  <input type="time" value={overrideStart} onChange={(e) => setOverrideStart(e.target.value)} className="border border-navy/20 px-2 py-2 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Close</label>
                  <input type="time" value={overrideEnd} onChange={(e) => setOverrideEnd(e.target.value)} className="border border-navy/20 px-2 py-2 text-sm font-body" />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-body text-navy/40 mb-1">Applies to</label>
              <select value={overrideStylist} onChange={(e) => setOverrideStylist(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body">
                <option value="">Entire salon</option>
                {stylists.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-body text-navy/40 mb-1">Note</label>
              <input type="text" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} placeholder="e.g. Holiday, Vacation" className="border border-navy/20 px-3 py-2 text-sm font-body" />
            </div>
          </div>
          <button
            onClick={saveOverride}
            disabled={saving || !overrideDate}
            className="mt-4 bg-rose text-white text-sm font-body px-6 py-2 hover:bg-rose-light transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : overrideMode === "range" ? "Save Date Range" : "Save Override"}
          </button>
        </div>

        {/* Existing overrides */}
        {loading ? (
          <p className="text-navy/40 font-body text-sm">Loading...</p>
        ) : overrides.length === 0 ? (
          <p className="text-navy/40 font-body text-sm">No overrides scheduled.</p>
        ) : (
          <div className="bg-white border border-navy/10 divide-y divide-navy/5">
            {overrides.map((rule) => (
              <div key={rule.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-body text-sm">
                    {rule.specificDate}
                    {rule.stylistId && (
                      <span className="ml-2 text-xs bg-navy/10 text-navy/60 px-2 py-0.5 rounded">
                        {getStylistName(rule.stylistId)}
                      </span>
                    )}
                  </p>
                  <p className="text-navy/40 text-xs font-body">
                    {rule.isClosed ? "Closed" : `${rule.startTime} – ${rule.endTime}`}
                    {rule.note ? ` — ${rule.note}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmDeleteId(rule.id)}
                  disabled={deletingId === rule.id}
                  className="text-red-500 text-xs font-body hover:underline disabled:opacity-60"
                >
                  {deletingId === rule.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <ConfirmModal
          title="Remove Rule"
          message="Are you sure you want to remove this schedule rule?"
          confirmLabel="Remove"
          onConfirm={() => {
            deleteRule(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      {toast && (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
