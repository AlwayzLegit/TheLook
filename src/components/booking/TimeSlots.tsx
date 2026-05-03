"use client";

import { useBranding } from "@/components/BrandingProvider";

interface Props {
  slots: string[];
  loading: boolean;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  error?: boolean;
  // When set, the empty-state message offers a "Change stylist" inline
  // action so a picked-but-fully-booked stylist isn't a dead end.
  onChangeStylist?: () => void;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// YYYY-MM-DD for "today" in Los Angeles, derived from the user's clock.
// Kept inline so TimeSlots stays dependency-free and works even if the
// salon's LA tz helpers aren't loaded on this surface.
function todayInLA(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" });
  return fmt.format(new Date());
}

// Minutes past midnight in LA, from the user's clock. Used as a defensive
// client-side filter so a stale server response can't surface past slots.
function nowMinutesInLA(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return h * 60 + m;
}

function slotMinutes(slot: string): number {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
}

export default function TimeSlots({ slots, loading, selectedDate, selectedTime, onSelectTime, error, onChangeStylist }: Props) {
  const brand = useBranding();
  // Belt-and-suspenders: if the selected date is today in LA, drop any
  // slot whose start time has already passed (with a 15-min lead). The
  // server's availability endpoint already does this, but a CDN-cached
  // response or a stale tab could surface past slots; this guarantees
  // the UI never offers a time that's already gone by.
  const visibleSlots = (() => {
    if (!selectedDate || selectedDate !== todayInLA()) return slots;
    const cutoff = nowMinutesInLA() + 15;
    return slots.filter((s) => slotMinutes(s) >= cutoff);
  })();
  if (!selectedDate) {
    return (
      <div className="flex items-center justify-center text-navy/70 font-body text-sm">
        Select a date to see available times
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center text-navy/70 font-body text-sm">
        Loading available times...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center text-red-600 font-body text-sm text-center">
        Unable to load available times. Please try again or call us at {brand.phone}.
      </div>
    );
  }

  if (visibleSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-navy/70 font-body text-sm text-center gap-3">
        <p>No available slots for this date. Try another day{onChangeStylist ? " — or pick a different stylist." : "."}</p>
        {onChangeStylist ? (
          <button
            type="button"
            onClick={onChangeStylist}
            className="text-rose hover:underline font-body text-sm"
          >
            Change stylist →
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="font-body text-sm text-navy/70 mb-3">Available times:</p>
      <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
        {visibleSlots.map((slot) => (
          <button
            key={slot}
            onClick={() => onSelectTime(slot)}
            className={`py-2.5 px-3 text-sm font-body border transition-colors ${
              selectedTime === slot
                ? "bg-rose text-white border-rose"
                : "border-navy/10 text-navy hover:border-rose/30 hover:bg-rose/5"
            }`}
          >
            {formatTime(slot)}
          </button>
        ))}
      </div>
    </div>
  );
}
