"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { normalizeSpecialties } from "@/lib/stylistSpecialties";
import StylistImage from "@/components/StylistImage";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface StylistInfo {
  id: string;
  name: string;
  slug?: string | null;
  bio?: string | null;
  image_url?: string | null;
  specialties?: string | string[] | null;
  active?: boolean;
  serviceCount?: number;
}

export interface ScheduleRule {
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

interface Props {
  stylist: StylistInfo;
  rules: ScheduleRule[]; // All rules; component filters to this stylist's weekly + override rows.
  // Callbacks hand off to the parent so it owns the fetch/save loop.
  onSaveWeekly: (args: {
    stylistId: string;
    dayOfWeek: number;
    isClosed: boolean;
    startTime: string;
    endTime: string;
  }) => Promise<boolean>;
  onClearWeekly: (ruleId: string) => Promise<boolean>;
  onDeleteOverride: (ruleId: string) => Promise<boolean>;
  onSaveOverride: (args: {
    stylistId: string;
    specificDate: string;
    isClosed: boolean;
    startTime: string;
    endTime: string;
    note: string;
  }) => Promise<boolean>;
  saving?: boolean;
}

function parseSpecialties(raw: StylistInfo["specialties"]): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(normalizeSpecialties(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function weeklySummary(rules: ScheduleRule[]): string {
  const weeklyForStylist = rules.filter((r) => r.ruleType === "weekly");
  if (weeklyForStylist.length === 0) return "Uses salon hours";
  const open = weeklyForStylist.filter((r) => !r.isClosed);
  const closed = weeklyForStylist.filter((r) => !!r.isClosed);
  if (open.length === 0 && closed.length > 0) {
    return `${closed.length} override${closed.length === 1 ? "" : "s"} — all closed`;
  }
  // Group by hour span so "Mon/Tue/Wed 10-6" collapses visually.
  const byHours = new Map<string, number[]>();
  for (const r of open) {
    const key = `${r.startTime}–${r.endTime}`;
    const list = byHours.get(key) ?? [];
    if (r.dayOfWeek !== null && r.dayOfWeek !== undefined) list.push(r.dayOfWeek);
    byHours.set(key, list);
  }
  const parts: string[] = [];
  for (const [hours, days] of byHours.entries()) {
    const label = days
      .sort((a, b) => a - b)
      .map((d) => DAY_SHORT[d])
      .join(", ");
    parts.push(`${label} ${hours}`);
  }
  if (closed.length > 0) {
    parts.push(`${closed.map((r) => DAY_SHORT[r.dayOfWeek ?? 0]).join(", ")} closed`);
  }
  return parts.join(" · ");
}

export default function StylistScheduleCard({
  stylist, rules, onSaveWeekly, onClearWeekly, onDeleteOverride, onSaveOverride, saving,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("10:00");
  const [editEnd, setEditEnd] = useState("18:00");
  const [editClosed, setEditClosed] = useState(false);

  // Override form state for this specific stylist.
  const [ovDate, setOvDate] = useState("");
  const [ovClosed, setOvClosed] = useState(true);
  const [ovStart, setOvStart] = useState("10:00");
  const [ovEnd, setOvEnd] = useState("17:00");
  const [ovNote, setOvNote] = useState("");

  const weekly = useMemo(
    () => rules.filter((r) => r.stylistId === stylist.id && r.ruleType === "weekly"),
    [rules, stylist.id],
  );
  const overrides = useMemo(
    () =>
      rules
        .filter((r) => r.stylistId === stylist.id && r.ruleType === "override")
        .sort((a, b) => (a.specificDate || "").localeCompare(b.specificDate || "")),
    [rules, stylist.id],
  );

  const specialties = parseSpecialties(stylist.specialties);

  const openEdit = (day: number) => {
    const existing = weekly.find((r) => r.dayOfWeek === day);
    setEditingDay(day);
    if (existing) {
      setEditClosed(!!existing.isClosed);
      setEditStart(existing.startTime || "10:00");
      setEditEnd(existing.endTime || "18:00");
    } else {
      setEditClosed(false);
      setEditStart("10:00");
      setEditEnd("18:00");
    }
  };

  const saveDay = async () => {
    if (editingDay === null) return;
    const ok = await onSaveWeekly({
      stylistId: stylist.id,
      dayOfWeek: editingDay,
      isClosed: editClosed,
      startTime: editStart,
      endTime: editEnd,
    });
    if (ok) setEditingDay(null);
  };

  const saveOverride = async () => {
    if (!ovDate) return;
    const ok = await onSaveOverride({
      stylistId: stylist.id,
      specificDate: ovDate,
      isClosed: ovClosed,
      startTime: ovStart,
      endTime: ovEnd,
      note: ovNote,
    });
    if (ok) {
      setOvDate("");
      setOvNote("");
    }
  };

  return (
    <div className="bg-white border border-navy/10 overflow-hidden">
      {/* Header / summary — click to expand */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 sm:px-5 py-4 flex items-center gap-4 text-left hover:bg-cream/40 transition-colors"
        aria-expanded={open}
      >
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-navy/10 to-gold/20 shrink-0">
          <StylistImage
            src={stylist.image_url}
            alt={stylist.name}
            initial={stylist.name.trim().charAt(0).toUpperCase()}
            initialClass="font-heading text-lg text-navy/70"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-heading text-base text-navy">{stylist.name}</p>
            {stylist.active === false && (
              <span className="text-[10px] font-body uppercase tracking-widest bg-navy/10 text-navy/60 px-2 py-0.5">
                Inactive
              </span>
            )}
            {typeof stylist.serviceCount === "number" && (
              <span className="text-[10px] font-body text-navy/50">
                {stylist.serviceCount} services
              </span>
            )}
            {overrides.length > 0 && (
              <span className="text-[10px] font-body bg-amber-100 text-amber-800 px-2 py-0.5">
                {overrides.length} override{overrides.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-xs font-body text-navy/50 truncate">{weeklySummary(rules.filter((r) => r.stylistId === stylist.id))}</p>
        </div>
        <svg
          className={`w-4 h-4 text-navy/40 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-navy/10 bg-cream/30 p-4 sm:p-5 space-y-5">
          {/* Profile snapshot */}
          <div className="grid sm:grid-cols-[1fr,auto] gap-3 items-start">
            <div>
              {stylist.bio ? (
                <p className="text-sm font-body text-navy/70 leading-relaxed">{stylist.bio}</p>
              ) : (
                <p className="text-xs font-body text-navy/40 italic">No bio yet — add one from their profile.</p>
              )}
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {specialties.map((s) => (
                    <span key={s} className="text-[10px] font-body bg-gold/15 text-gold px-2 py-0.5">{s}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href="/admin/stylists"
                className="inline-flex items-center gap-1.5 text-xs font-body border border-navy/20 px-3 py-1.5 hover:bg-navy/5"
              >
                Edit profile
              </Link>
              {stylist.slug && (
                <Link
                  href={`/stylists/${stylist.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-body border border-navy/20 px-3 py-1.5 hover:bg-navy/5"
                >
                  View public profile ↗
                </Link>
              )}
            </div>
          </div>

          {/* Weekly hours */}
          <div>
            <p className="text-xs font-body text-navy/60 font-bold mb-2 uppercase tracking-widest">
              Weekly hours
            </p>
            <div className="bg-white border border-navy/10 divide-y divide-navy/5">
              {DAYS.map((dayName, dayIndex) => {
                const rule = weekly.find((r) => r.dayOfWeek === dayIndex);
                const isClosed = rule ? !!rule.isClosed : false;
                const hours = rule && !isClosed ? `${rule.startTime} – ${rule.endTime}` : null;
                const isEditing = editingDay === dayIndex;

                return (
                  <div key={dayIndex}>
                    <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <span className="font-body text-sm text-navy/80 w-24 shrink-0">
                        {dayName}
                      </span>
                      <span className="flex-1 text-right font-body text-sm">
                        {rule ? (
                          isClosed ? (
                            <span className="text-red-500">CLOSED</span>
                          ) : (
                            <span className="text-navy/80">{hours}</span>
                          )
                        ) : (
                          <span className="text-navy/35 text-xs italic">Uses salon hours</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEdit(dayIndex)}
                          className="text-xs font-body text-navy/60 hover:text-navy"
                        >
                          {rule ? "Edit" : "Override"}
                        </button>
                        {rule && (
                          <button
                            onClick={() => onClearWeekly(rule.id)}
                            className="text-xs font-body text-red-500/80 hover:text-red-600"
                            title="Clear override (fall back to salon hours)"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="px-4 py-3 bg-cream/60 border-t border-navy/5">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editClosed}
                              onChange={(e) => setEditClosed(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-body">Closed</span>
                          </label>
                          {!editClosed && (
                            <>
                              <input
                                type="time"
                                value={editStart}
                                onChange={(e) => setEditStart(e.target.value)}
                                className="border border-navy/20 px-2 py-1.5 text-sm font-body"
                              />
                              <span className="text-navy/40">to</span>
                              <input
                                type="time"
                                value={editEnd}
                                onChange={(e) => setEditEnd(e.target.value)}
                                className="border border-navy/20 px-2 py-1.5 text-sm font-body"
                              />
                            </>
                          )}
                          <button
                            onClick={saveDay}
                            disabled={saving}
                            className="bg-navy text-white text-xs font-body px-4 py-2 hover:bg-navy/90 disabled:opacity-60"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingDay(null)}
                            className="text-xs font-body text-navy/50 hover:text-navy px-3 py-2"
                          >
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

          {/* Date overrides for this stylist */}
          <div>
            <p className="text-xs font-body text-navy/60 font-bold mb-2 uppercase tracking-widest">
              Time off &amp; special hours
            </p>
            {overrides.length > 0 && (
              <div className="bg-white border border-navy/10 divide-y divide-navy/5 mb-3">
                {overrides.map((r) => (
                  <div key={r.id} className="px-4 py-2 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-body">{r.specificDate}</span>
                      <span className="text-navy/50 text-xs ml-2 font-body">
                        {r.isClosed ? "Off" : `${r.startTime} – ${r.endTime}`}
                        {r.note ? ` · ${r.note}` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteOverride(r.id)}
                      className="text-xs font-body text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-navy/10 p-3">
              <p className="text-[10px] font-body text-navy/40 uppercase tracking-widest mb-2">
                Add date override
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={ovDate}
                  onChange={(e) => setOvDate(e.target.value)}
                  className="border border-navy/20 px-3 py-2 text-sm font-body"
                />
                <select
                  value={ovClosed ? "closed" : "open"}
                  onChange={(e) => setOvClosed(e.target.value === "closed")}
                  className="border border-navy/20 px-3 py-2 text-sm font-body"
                >
                  <option value="closed">Off</option>
                  <option value="open">Special hours</option>
                </select>
                {!ovClosed && (
                  <>
                    <input
                      type="time"
                      value={ovStart}
                      onChange={(e) => setOvStart(e.target.value)}
                      className="border border-navy/20 px-2 py-2 text-sm font-body"
                    />
                    <span className="text-navy/40 text-sm">to</span>
                    <input
                      type="time"
                      value={ovEnd}
                      onChange={(e) => setOvEnd(e.target.value)}
                      className="border border-navy/20 px-2 py-2 text-sm font-body"
                    />
                  </>
                )}
                <input
                  type="text"
                  value={ovNote}
                  onChange={(e) => setOvNote(e.target.value)}
                  placeholder="Note (e.g. Vacation, Doctor)"
                  className="flex-1 min-w-[160px] border border-navy/20 px-3 py-2 text-sm font-body"
                />
                <button
                  onClick={saveOverride}
                  disabled={saving || !ovDate}
                  className="bg-rose text-white text-xs font-body px-4 py-2 hover:bg-rose-light disabled:opacity-60 uppercase tracking-widest"
                >
                  {saving ? "Saving..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
