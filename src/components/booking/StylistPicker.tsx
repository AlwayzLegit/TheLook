"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BOOKING } from "@/lib/constants";

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
  // Optional variant ids aligned by index with serviceIds so availability
  // lookups use the right per-service duration.
  variantIds?: string[];
  // When set, we filter stylists to only those actually free at this slot.
  date?: string | null;
  startTime?: string | null;
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

export default function StylistPicker({
  stylists, serviceIds, variantIds, date, startTime, onSelect, selected,
}: Props) {
  // For each stylist, asynchronously check their availability at the chosen
  // slot. Tracks three states so we can surface the right disabled reason:
  //   "free"   — free at the requested time (tile enabled)
  //   "booked" — scheduled that day but that slot is taken
  //   "off"    — not scheduled that day at all
  type Avail = "free" | "booked" | "off";
  const [availMap, setAvailMap] = useState<Record<string, Avail>>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!date || !startTime || serviceIds.length === 0) {
      setAvailMap({});
      return;
    }
    let cancelled = false;
    setChecking(true);
    (async () => {
      const eligible = stylists.filter((s) =>
        serviceIds.every((id) => s.serviceIds.includes(id))
      );
      const variantQs = (variantIds || []).length > 0
        ? "&" + (variantIds || []).map((v) => `variantIds=${encodeURIComponent(v || "")}`).join("&")
        : "";
      const results = await Promise.all(
        eligible.map(async (s) => {
          try {
            const r = await fetch(
              `/api/availability?stylistId=${s.id}&date=${date}&${serviceIds.map((id) => `serviceIds=${id}`).join("&")}${variantQs}`,
            );
            if (!r.ok) return [s.id, "off" as Avail] as const;
            const data = await r.json();
            const slots: string[] = data.slots || [];
            if (slots.length === 0) return [s.id, "off" as Avail] as const;
            return [s.id, slots.includes(startTime) ? "free" : "booked"] as const;
          } catch {
            return [s.id, "off" as Avail] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, Avail> = {};
      for (const [id, state] of results) map[id] = state;
      setAvailMap(map);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [stylists, serviceIds, variantIds, date, startTime]);

  // Defensive filter: even if the public API accidentally returns a stylist
  // named "Any Stylist" or the sentinel row, don't render a duplicate tile.
  const realStylists = stylists.filter(
    (s) => s.id !== BOOKING.ANY_STYLIST_ID && s.name.trim().toLowerCase() !== "any stylist",
  );
  const tiles: Stylist[] = [ANY_STYLIST, ...realStylists];

  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Choose Your Stylist</h2>
      <p className="text-navy/50 font-body text-sm text-center mb-8">
        {date && startTime
          ? "Showing stylists available at your chosen time"
          : serviceIds.length > 1
            ? `Showing stylists who offer all ${serviceIds.length} selected services`
            : "Select who you'd like to see"}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {tiles.map((stylist) => {
          const isAny = stylist.id === BOOKING.ANY_STYLIST_ID;
          const offersAll = isAny || serviceIds.every((id) => stylist.serviceIds.includes(id));
          const state: Avail | null = isAny || !date || !startTime ? "free" : (availMap[stylist.id] ?? null);
          const free = state === "free";
          const available = offersAll && (free || isAny);
          const isSelected =
            selected === "any"
              ? isAny
              : selected?.id === stylist.id;

          return (
            <button
              key={stylist.id}
              onClick={() => available && onSelect(isAny ? "any" : stylist)}
              disabled={!available}
              className={`p-6 border text-left transition-all flex flex-col ${
                isSelected
                  ? "border-rose bg-rose/5 shadow-md"
                  : available
                    ? "border-navy/10 hover:border-rose/30 hover:shadow-md"
                    : "border-navy/5 opacity-40 cursor-not-allowed"
              }`}
            >
              <div className="w-20 h-20 mb-4 rounded-full overflow-hidden relative bg-gradient-to-br from-navy/10 to-gold/20 self-center">
                {isAny ? (
                  <div className="w-full h-full flex items-center justify-center text-navy/50">
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
                <p className="text-xs font-body text-navy/60 mt-2 text-center leading-relaxed">
                  {stylist.bio}
                </p>
              )}
              {!offersAll && (
                <p className="text-xs text-navy/60 font-body mt-3 text-center">
                  Doesn&apos;t offer all selected services
                </p>
              )}
              {offersAll && !free && date && startTime && !isAny && (
                <p className="text-xs text-navy/60 font-body mt-3 text-center">
                  {state === "off" ? "Off today" : "Not available at this time"}
                </p>
              )}
            </button>
          );
        })}
      </div>
      {checking && (
        <p className="text-center text-xs text-navy/60 font-body mt-4">Checking availability…</p>
      )}
    </div>
  );
}
