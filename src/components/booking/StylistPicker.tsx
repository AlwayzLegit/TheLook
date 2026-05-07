"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BOOKING } from "@/lib/constants";
import { isOptimizableImageHost } from "@/lib/imageHosts";

interface Stylist {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  specialties: string[];
  serviceIds: string[];
}

interface Props {
  stylists: Stylist[];
  // A stylist must offer ALL these services to be bookable for this request.
  serviceIds: string[];
  // Optional variant ids aligned by index with serviceIds so the next-
  // available lookup uses the right per-service duration.
  variantIds?: string[];
  onSelect: (stylist: Stylist | "any") => void;
  selected: Stylist | "any" | null;
}

const ANY_STYLIST: Stylist = {
  id: BOOKING.ANY_STYLIST_ID,
  name: "Any Stylist",
  bio: "First available — we'll match you with whichever stylist has an opening at your chosen time.",
  imageUrl: null,
  specialties: ["First available"],
  serviceIds: [],
};

// Format an (ISO date, HH:MM) pair into a compact "next open" hint.
// Deliberately terse so the tile doesn't grow — e.g. "Sat Apr 26, 2:00 PM".
function formatNextHint(dateISO: string, time: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  // Anchor at noon UTC for the date portion so DST can't nudge us into
  // the wrong weekday.
  const dateLabel = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const [hh, mm] = time.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  const timeLabel = mm === 0 ? `${h12} ${ampm}` : `${h12}:${mm.toString().padStart(2, "0")} ${ampm}`;
  return `${dateLabel}, ${timeLabel}`;
}

export default function StylistPicker({
  stylists, serviceIds, variantIds, onSelect, selected,
}: Props) {
  // For each real stylist, fetch the next available slot across the
  // booking window so the tile can show a "Next open: Sat 2:00 PM"
  // hint. One lightweight call per stylist (N parallel); results are
  // cached for the mount. If the stylist has zero availability the
  // hint reads "No openings" and the tile still renders clickable so
  // the customer sees the empty-state message on the next step.
  const [nextMap, setNextMap] = useState<Record<string, { date: string; time: string } | null | "loading">>({});

  useEffect(() => {
    if (serviceIds.length === 0) return;
    let cancelled = false;
    const eligible = stylists.filter(
      (s) => s.id !== BOOKING.ANY_STYLIST_ID
        && s.name.trim().toLowerCase() !== "any stylist"
        && serviceIds.every((id) => s.serviceIds.includes(id)),
    );
    // Initialise every tile to "loading" so the hint area reserves
    // vertical space — avoids layout shift when results land.
    setNextMap(() => Object.fromEntries(eligible.map((s) => [s.id, "loading" as const])));
    const variantQs = (variantIds || []).length > 0
      ? "&" + (variantIds || []).map((v) => `variantIds=${encodeURIComponent(v || "")}`).join("&")
      : "";
    (async () => {
      const results = await Promise.all(
        eligible.map(async (s) => {
          try {
            const r = await fetch(
              `/api/availability-next?stylistId=${s.id}&${serviceIds.map((id) => `serviceIds=${id}`).join("&")}${variantQs}`,
            );
            if (!r.ok) return [s.id, null] as const;
            const data = await r.json();
            if (data?.nextSlot?.date && data?.nextSlot?.time) {
              return [s.id, { date: data.nextSlot.date, time: data.nextSlot.time }] as const;
            }
            return [s.id, null] as const;
          } catch {
            return [s.id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setNextMap(Object.fromEntries(results));
    })();
    return () => { cancelled = true; };
  }, [stylists, serviceIds, variantIds]);

  // Defensive filter: even if the public API accidentally returns a stylist
  // named "Any Stylist" or the sentinel row, don't render a duplicate tile.
  const realStylists = stylists.filter(
    (s) => s.id !== BOOKING.ANY_STYLIST_ID && s.name.trim().toLowerCase() !== "any stylist",
  );
  const tiles: Stylist[] = [ANY_STYLIST, ...realStylists];

  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Choose Your Stylist</h2>
      <p className="text-navy/70 font-body text-sm text-center mb-8">
        {serviceIds.length > 1
          ? `Showing stylists who offer all ${serviceIds.length} selected services`
          : "Pick a stylist — you'll see their calendar next"}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {tiles.map((stylist) => {
          const isAny = stylist.id === BOOKING.ANY_STYLIST_ID;
          const offersAll = isAny || serviceIds.every((id) => stylist.serviceIds.includes(id));
          const isSelected =
            selected === "any"
              ? isAny
              : selected?.id === stylist.id;
          const next = isAny ? undefined : nextMap[stylist.id];

          return (
            <button
              key={stylist.id}
              onClick={() => offersAll && onSelect(isAny ? "any" : stylist)}
              disabled={!offersAll}
              className={`p-6 border text-left transition-all flex flex-col ${
                isSelected
                  ? "border-rose bg-rose/5 shadow-md"
                  : offersAll
                    ? "border-navy/10 hover:border-rose/30 hover:shadow-md"
                    : "border-navy/5 opacity-40 cursor-not-allowed"
              }`}
            >
              <div className="w-20 h-20 mb-4 rounded-full overflow-hidden relative bg-gradient-to-br from-navy/10 to-gold/20 self-center">
                {isAny ? (
                  <div className="w-full h-full flex items-center justify-center text-navy/70">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </div>
                ) : stylist.imageUrl ? (
                  <Image
                    src={stylist.imageUrl}
                    alt={stylist.name}
                    fill
                    className="object-cover"
                    unoptimized={!isOptimizableImageHost(stylist.imageUrl)}
                  />
                ) : (
                  // No photo uploaded — show the stylist's initial on the brand
                  // gradient instead of falling back to a stock photo (which
                  // makes every stylist look identical).
                  <div className="w-full h-full flex items-center justify-center font-heading text-2xl text-navy/70">
                    {stylist.name.trim().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="font-heading text-lg text-center">{stylist.name}</p>
              {stylist.bio && (
                <p className="text-xs font-body text-navy/70 mt-2 text-center leading-relaxed">
                  {stylist.bio}
                </p>
              )}
              {!offersAll && (
                <p className="text-xs text-navy/70 font-body mt-3 text-center">
                  Doesn&apos;t offer all selected services
                </p>
              )}
              {offersAll && !isAny && (
                <p className="text-[11px] font-body text-gold text-center mt-3 min-h-[1rem] tracking-wide">
                  {next === "loading" || next === undefined
                    ? " " /* nbsp reserves vertical space */
                    : next === null
                      ? "No openings in the next 2 weeks"
                      : `Next open: ${formatNextHint(next.date, next.time)}`}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
