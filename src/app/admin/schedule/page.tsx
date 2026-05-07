"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StylistScheduleCard, {
  type StylistInfo,
  type ScheduleRule,
} from "@/components/admin/StylistScheduleCard";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulePage() {
  const { status } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [stylists, setStylists] = useState<StylistInfo[]>([]);
  const [serviceCountByStylist, setServiceCountByStylist] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Salon-level weekly-hours editing.
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editDayStart, setEditDayStart] = useState("10:00");
  const [editDayEnd, setEditDayEnd] = useState("18:00");
  const [editDayClosed, setEditDayClosed] = useState(false);

  // Salon-level override form (stylist-specific overrides live on each card).
  const [overrideMode, setOverrideMode] = useState<"single" | "range">("single");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideDateEnd, setOverrideDateEnd] = useState("");
  const [overrideClosed, setOverrideClosed] = useState(true);
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideNote, setOverrideNote] = useState("");

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

  const loadStylistsAndServices = async () => {
    // Pull stylists (with inactive) so admins can still see/schedule them,
    // and service mappings so each card can show a "N services" badge.
    const [sRes, mRes] = await Promise.all([
      fetch("/api/admin/stylists?includeInactive=true"),
      fetch("/api/admin/stylists").then(async (r) => {
        // fall-through to mappings if we need them
        if (!r.ok) return [];
        return r.json();
      }).catch(() => []),
    ]);
    if (sRes.ok) {
      const list = await sRes.json();
      if (Array.isArray(list)) setStylists(list as StylistInfo[]);
    }
    // Fetch service-mapping counts in one shot.
    try {
      const r = await fetch("/api/stylists");
      if (r.ok) {
        const pub = await r.json();
        if (Array.isArray(pub)) {
          const counts: Record<string, number> = {};
          type StylistApi = { id: string; serviceIds?: string[] };
          for (const st of pub as StylistApi[]) {
            counts[st.id] = Array.isArray(st.serviceIds) ? st.serviceIds.length : 0;
          }
          setServiceCountByStylist(counts);
        }
      }
    } catch {
      // non-critical
    }
    void mRes;
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadRules();
      loadStylistsAndServices();
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
        const data = await res.json().catch(() => ({}));
        setToast({ type: "error", message: data.error || "Failed to save rule." });
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
        return false;
      }
      setToast({ type: "success", message: "Rule removed." });
      loadRules();
      return true;
    } finally {
      setDeletingId(null);
    }
  };

  // --- Salon weekly ---
  const saveSalonWeekly = async () => {
    if (editingDay === null) return;
    const ok = await saveRule({
      ruleType: "weekly",
      dayOfWeek: editingDay,
      stylistId: null,
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

  const openEditDay = (day: number) => {
    const existing = rules.find(
      (r) => r.ruleType === "weekly" && r.dayOfWeek === day && !r.stylistId,
    );
    setEditingDay(day);
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

  // --- Salon override (single or range) ---
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
        stylistId: null,
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

  // --- Per-stylist card callbacks ---
  const saveStylistWeekly: React.ComponentProps<typeof StylistScheduleCard>["onSaveWeekly"] =
    async ({ stylistId, dayOfWeek, isClosed, startTime, endTime }) => {
      const ok = await saveRule({
        ruleType: "weekly",
        dayOfWeek,
        stylistId,
        isClosed,
        startTime: isClosed ? null : startTime,
        endTime: isClosed ? null : endTime,
        note: null,
      });
      if (ok) {
        setToast({ type: "success", message: `${DAYS[dayOfWeek]} hours updated.` });
        loadRules();
      }
      return ok;
    };

  const saveStylistOverride: React.ComponentProps<typeof StylistScheduleCard>["onSaveOverride"] =
    async ({ stylistId, specificDate, isClosed, startTime, endTime, note }) => {
      const ok = await saveRule({
        ruleType: "override",
        specificDate,
        stylistId,
        isClosed,
        startTime: isClosed ? null : startTime,
        endTime: isClosed ? null : endTime,
        note: note || (isClosed ? "Off" : "Special hours"),
      });
      if (ok) {
        setToast({ type: "success", message: "Override saved." });
        loadRules();
      }
      return ok;
    };

  const clearRule: React.ComponentProps<typeof StylistScheduleCard>["onClearWeekly"] =
    async (ruleId) => {
      return await deleteRule(ruleId);
    };

  const salonOverrides = useMemo(
    () =>
      rules
        .filter((r) => r.ruleType === "override" && !r.stylistId)
        .sort((a, b) => (a.specificDate || "").localeCompare(b.specificDate || "")),
    [rules],
  );

  const salonWeekly = useMemo(
    () =>
      rules
        .filter((r) => r.ruleType === "weekly" && !r.stylistId)
        .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)),
    [rules],
  );

  const activeStylists = useMemo(
    () =>
      stylists
        .filter((s) => s.active !== false)
        .map((s) => ({ ...s, serviceCount: serviceCountByStylist[s.id] })),
    [stylists, serviceCountByStylist],
  );
  const inactiveStylists = useMemo(
    () =>
      stylists
        .filter((s) => s.active === false)
        .map((s) => ({ ...s, serviceCount: serviceCountByStylist[s.id] })),
    [stylists, serviceCountByStylist],
  );

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-heading text-3xl mb-8">Schedule</h1>

      {/* ───── SECTION 1: Salon Weekly Hours ───── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl">Salon hours</h2>
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

                {editingDay === dayIndex && (
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
                      <button onClick={saveSalonWeekly} disabled={saving} className="bg-navy text-white text-xs font-body px-4 py-2 hover:bg-navy/90 disabled:opacity-60">
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

      {/* ───── SECTION 2: Stylist cards ───── */}
      {stylists.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl">Stylists</h2>
            <p className="text-xs text-navy/40 font-body">
              Click a stylist to edit their hours and time off
            </p>
          </div>

          <div className="space-y-2">
            {activeStylists.map((stylist) => (
              <StylistScheduleCard
                key={stylist.id}
                stylist={stylist}
                rules={rules}
                onSaveWeekly={saveStylistWeekly}
                onSaveOverride={saveStylistOverride}
                onClearWeekly={clearRule}
                onDeleteOverride={clearRule}
                saving={saving}
              />
            ))}
          </div>

          {inactiveStylists.length > 0 && (
            <details className="mt-4 bg-white border border-navy/10">
              <summary className="cursor-pointer px-4 py-3 font-body text-sm text-navy/50 hover:text-navy hover:bg-cream/40">
                Inactive stylists ({inactiveStylists.length})
              </summary>
              <div className="divide-y divide-navy/5">
                {inactiveStylists.map((stylist) => (
                  <StylistScheduleCard
                    key={stylist.id}
                    stylist={stylist}
                    rules={rules}
                    onSaveWeekly={saveStylistWeekly}
                    onSaveOverride={saveStylistOverride}
                    onClearWeekly={clearRule}
                    onDeleteOverride={clearRule}
                    saving={saving}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ───── SECTION 3: Salon-wide closures & overrides ───── */}
      <div className="mb-10">
        <h2 className="font-heading text-xl mb-2">Salon-wide closures &amp; overrides</h2>
        <p className="text-navy/40 text-xs font-body mb-4">
          Close the whole salon for holidays, vacations, or set special hours for specific dates.
          For a single stylist&apos;s time off, use their card above.
        </p>

        <div className="bg-cream/50 border border-navy/10 p-4 mb-6">
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
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-body text-navy/40 mb-1">Note</label>
              <input type="text" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} placeholder="e.g. Holiday, Vacation" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
            </div>
          </div>
          <button
            onClick={saveOverride}
            disabled={saving || !overrideDate}
            className="mt-4 bg-rose text-white text-sm font-body px-6 py-2 hover:bg-rose-light transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : overrideMode === "range" ? "Save date range" : "Save override"}
          </button>
        </div>

        {loading ? (
          <p className="text-navy/40 font-body text-sm">Loading...</p>
        ) : salonOverrides.length === 0 ? (
          <p className="text-navy/40 font-body text-sm">No salon-wide overrides scheduled.</p>
        ) : (
          <div className="bg-white border border-navy/10 divide-y divide-navy/5">
            {salonOverrides.map((rule) => (
              <div key={rule.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-body text-sm">{rule.specificDate}</p>
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
          title="Remove override"
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
