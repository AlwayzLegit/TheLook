"use client";

import Image from "next/image";

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
  onSelect: (stylist: Stylist) => void;
  selected: Stylist | null;
}

export default function StylistPicker({ stylists, serviceIds, onSelect, selected }: Props) {
  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Choose Your Stylist</h2>
      <p className="text-navy/50 font-body text-sm text-center mb-8">
        {serviceIds.length > 1
          ? `Showing stylists who offer all ${serviceIds.length} selected services`
          : "Select who you'd like to see"}
      </p>

      <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
        {stylists.map((stylist) => {
          const available = serviceIds.every((id) => stylist.serviceIds.includes(id));
          return (
            <button
              key={stylist.id}
              onClick={() => available && onSelect(stylist)}
              disabled={!available}
              className={`p-6 border text-center transition-all ${
                selected?.id === stylist.id
                  ? "border-rose bg-rose/5 shadow-md"
                  : available
                    ? "border-navy/10 hover:border-rose/30 hover:shadow-md"
                    : "border-navy/5 opacity-40 cursor-not-allowed"
              }`}
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden relative">
                <Image
                  src={stylist.imageUrl || "/images/gallery/gallery-01.jpg"}
                  alt={stylist.name}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="font-heading text-lg">{stylist.name}</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {stylist.specialties.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-body text-navy/50 border border-navy/10 px-2 py-0.5"
                  >
                    {s}
                  </span>
                ))}
              </div>
              {!available && (
                <p className="text-xs text-navy/40 font-body mt-3">
                  Doesn&apos;t offer all selected services
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
