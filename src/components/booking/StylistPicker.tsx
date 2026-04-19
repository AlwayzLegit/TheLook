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
  stylists, serviceIds, date, startTime, onSelect, selected,
}: Props) {
  // For each stylist, asynchronously check whether they're free at the chosen
  // slot. Skipped when date/startTime aren't both set.
  const [freeMap, setFreeMap] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!date || !startTime || serviceIds.length === 0) {
      setFreeMap({});
      return;
    }
    let cancelled = false;
    setChecking(true);
    (async () => {
      const eligible = stylists.filter((s) =>
        serviceIds.every((id) => s.serviceIds.includes(id))
      );
      const results = await Promise.all(
        eligible.map(async (s) => {
          const params = new URLSearchParams({
            stylistId: s.id,
            date,
            ...Object.fromEntries(serviceIds.map((id, i) => [`serviceIds[${i}]`, id])),
          });
          serviceIds.forEach((id) => params.append("serviceIds", id));
          try {
            const r = await fetch(`/api/availability?stylistId=${s.id}&date=${date}&${serviceIds.map((id) => `serviceIds=${id}`).join("&")}`);
            if (!r.ok) return [s.id, false] as const;
            const data = await r.json();
            const slots: string[] = data.slots || [];
            return [s.id, slots.includes(startTime)] as const;
          } catch {
            return [s.id, false] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, boolean> = {};
      for (const [id, ok] of results) map[id] = ok;
      setFreeMap(map);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [stylists, serviceIds, date, startTime]);

  const tiles: Stylist[] = [ANY_STYLIST, ...stylists];

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
          const free = isAny || !date || !startTime || freeMap[stylist.id] === true;
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
              <div className="w-20 h-20 mb-4 rounded-full overflow-hidden relative bg-navy/5 self-center">
                {isAny ? (
                  <div className="w-full h-full flex items-center justify-center text-navy/50">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </div>
                ) : (
                  <Image
                    src={stylist.imageUrl || "/images/gallery/gallery-01.jpg"}
                    alt={stylist.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <p className="font-heading text-lg text-center">{stylist.name}</p>
              {stylist.bio && (
                <p className="text-xs font-body text-navy/60 mt-2 text-center leading-relaxed">
                  {stylist.bio}
                </p>
              )}
              {!offersAll && (
                <p className="text-xs text-navy/40 font-body mt-3 text-center">
                  Doesn&apos;t offer all selected services
                </p>
              )}
              {offersAll && !free && date && startTime && !isAny && (
                <p className="text-xs text-navy/40 font-body mt-3 text-center">
                  Booked at this time
                </p>
              )}
            </button>
          );
        })}
      </div>
      {checking && (
        <p className="text-center text-xs text-navy/40 font-body mt-4">Checking availability…</p>
      )}
    </div>
  );
}
