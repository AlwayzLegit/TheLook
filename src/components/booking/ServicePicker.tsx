"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  const categories = Object.keys(services);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Auto-open first category on load
  useEffect(() => {
    if (categories.length > 0 && !openCategory) {
      setOpenCategory(categories[0]);
    }
  }, [categories, openCategory]);

  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Choose a Service</h2>
      <p className="text-navy/55 font-body text-sm text-center mb-8">
        Select the service you&apos;d like to book
      </p>

      <div className="space-y-2 max-w-2xl mx-auto">
        {categories.map((cat) => (
          <div key={cat} className="border border-navy/8 rounded-sm overflow-hidden">
            <button
              onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
              className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-cream/50 transition-colors"
            >
              <span className="font-heading text-lg">{cat}</span>
              <div className="flex items-center gap-3">
                <span className="text-navy/35 text-xs font-body">
                  {services[cat].length} services
                </span>
                <motion.svg
                  animate={{ rotate: openCategory === cat ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-4 h-4 text-navy/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </div>
            </button>

            <AnimatePresence>
              {openCategory === cat && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-navy/5">
                    {services[cat].map((service) => (
                      <button
                        key={service.id}
                        onClick={() => onSelect(service)}
                        className={`w-full px-6 py-4 flex items-center justify-between text-left transition-all duration-200 ${
                          selected?.id === service.id
                            ? "bg-rose/8 border-l-3 border-rose"
                            : "hover:bg-cream/40 border-l-3 border-transparent"
                        }`}
                      >
                        <div>
                          <p className={`font-body text-sm ${selected?.id === service.id ? "text-rose font-medium" : "text-navy"}`}>
                            {service.name}
                          </p>
                          <p className="font-body text-xs text-navy/40 mt-0.5">
                            {service.duration} min
                          </p>
                        </div>
                        <span className="text-gold font-heading text-base shrink-0 ml-4">
                          {service.priceText}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
