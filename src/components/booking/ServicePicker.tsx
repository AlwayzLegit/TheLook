"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Service {
  id: string;
  category: string;
  name: string;
  priceText: string;
  priceMin?: number;
  duration: number;
}

interface Props {
  services: Record<string, Service[]>;
  onToggle: (service: Service) => void;
  onContinue: () => void;
  selected: Service[];
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatPrice(cents: number, hasPlus: boolean) {
  const dollars = Math.round(cents / 100);
  return `$${dollars}${hasPlus ? "+" : ""}`;
}

export default function ServicePicker({ services, onToggle, onContinue, selected }: Props) {
  const categories = Object.keys(services);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const selectedIds = new Set(selected.map((s) => s.id));

  // Auto-open first category on load
  useEffect(() => {
    if (categories.length > 0 && !openCategory) {
      setOpenCategory(categories[0]);
    }
  }, [categories, openCategory]);

  const totalDuration = selected.reduce((sum, s) => sum + (s.duration || 0), 0);
  const hasPriceMin = selected.length > 0 && selected.every((s) => typeof s.priceMin === "number" && s.priceMin > 0);
  const totalPriceMin = selected.reduce((sum, s) => sum + (s.priceMin || 0), 0);
  const hasPlus = selected.some((s) => s.priceText.includes("+"));
  const priceSummary = hasPriceMin
    ? formatPrice(totalPriceMin, hasPlus)
    : selected.length > 0
      ? "Confirmed at appointment"
      : "";

  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Choose Your Services</h2>
      <p className="text-navy/55 font-body text-sm text-center mb-8">
        Pick one or more — we&apos;ll book them back-to-back with your stylist.
      </p>

      <div className="space-y-2 max-w-2xl mx-auto pb-32">
        {categories.map((cat) => {
          const selectedInCat = services[cat].filter((s) => selectedIds.has(s.id)).length;
          return (
            <div key={cat} className="border border-navy/8 rounded-sm overflow-hidden bg-white">
              <button
                onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-cream/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-heading text-lg">{cat}</span>
                  {selectedInCat > 0 && (
                    <span className="bg-rose text-white text-[10px] font-body tracking-wider uppercase px-2 py-0.5 rounded-full">
                      {selectedInCat} added
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-navy/50 text-xs font-body">
                    {services[cat].length} services
                  </span>
                  <motion.svg
                    animate={{ rotate: openCategory === cat ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4 text-navy/45"
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
                      {services[cat].map((service) => {
                        const isSelected = selectedIds.has(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onToggle(service)}
                            aria-pressed={isSelected}
                            className={`w-full px-6 py-4 flex items-center justify-between text-left transition-all duration-200 ${
                              isSelected
                                ? "bg-rose/8 border-l-[3px] border-rose"
                                : "hover:bg-cream/40 border-l-[3px] border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-rose border-rose text-white"
                                    : "bg-white border-navy/25"
                                }`}
                                aria-hidden
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                              <div>
                                <p className={`font-body text-sm ${isSelected ? "text-rose font-medium" : "text-navy"}`}>
                                  {service.name}
                                </p>
                                <p className="font-body text-xs text-navy/40 mt-0.5">
                                  {formatDuration(service.duration)}
                                </p>
                              </div>
                            </div>
                            <span className="text-gold font-heading text-base shrink-0 ml-4">
                              {service.priceText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Sticky summary bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy/10 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-30">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {selected.length === 0 ? (
              <p className="text-navy/50 text-sm font-body">No services selected yet</p>
            ) : (
              <>
                <p className="text-navy/50 text-xs font-body mb-0.5">
                  {selected.length} {selected.length === 1 ? "service" : "services"} · {formatDuration(totalDuration)}
                </p>
                <p className="font-heading text-xl text-gold truncate" title={selected.map((s) => s.name).join(", ")}>
                  {priceSummary}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onContinue}
            disabled={selected.length === 0}
            className="bg-rose hover:bg-rose-light disabled:opacity-40 disabled:cursor-not-allowed text-white tracking-widest uppercase text-sm px-7 py-3 transition-colors font-body shrink-0"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
