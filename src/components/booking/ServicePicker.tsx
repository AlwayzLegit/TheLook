"use client";

import { useState } from "react";

interface Service {
  id: string;
  category: string;
  name: string;
  priceText: string;
  duration: number;
}

interface Props {
  services: Record<string, Service[]>;
  onSelect: (service: Service) => void;
  selected: Service | null;
}

export default function ServicePicker({ services, onSelect, selected }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const categories = Object.keys(services);

  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Choose a Service</h2>
      <p className="text-navy/50 font-body text-sm text-center mb-8">
        Select the service you&apos;d like to book
      </p>

      <div className="space-y-3 max-w-2xl mx-auto">
        {categories.map((cat) => (
          <div key={cat} className="border border-navy/10 overflow-hidden">
            <button
              onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
              className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-cream transition-colors"
            >
              <span className="font-heading text-lg">{cat}</span>
              <span className="text-navy/40 text-sm font-body">
                {services[cat].length} services
              </span>
            </button>

            {openCategory === cat && (
              <div className="border-t border-navy/10">
                {services[cat].map((service) => (
                  <button
                    key={service.id}
                    onClick={() => onSelect(service)}
                    className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                      selected?.id === service.id
                        ? "bg-rose/10 border-l-4 border-rose"
                        : "hover:bg-cream/50 border-l-4 border-transparent"
                    }`}
                  >
                    <div>
                      <p className="font-body text-sm text-navy">{service.name}</p>
                      <p className="font-body text-xs text-navy/40 mt-1">
                        {service.duration} min
                      </p>
                    </div>
                    <span className="text-gold font-heading text-base shrink-0 ml-4">
                      {service.priceText}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
