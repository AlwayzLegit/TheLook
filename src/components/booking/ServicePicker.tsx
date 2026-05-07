"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Service {
  id: string;
  category: string;
  // Sub-grouping within a category. Today only Haircuts uses it
  // ("Unisex" / "Women's" / "Men's") so the booking flow renders
  // those rows under a sub-header inside the Haircuts panel —
  // mirrors the homepage Haircuts gallery split. Null/missing for
  // every other category, which still renders as a flat list.
  subcategory?: string | null;
  name: string;
  priceText: string;
  priceMin?: number;
  duration: number;
  // Present when this row is a variant of a parent service (e.g. Facial Hair
  // Removal — Brow). Distinct variants must be independently selectable, so
  // the picker keys by (id, variantId) rather than id alone.
  variantId?: string;
  variantName?: string;
  // True when this variant is an add-on rather than a replacement —
  // picking it adds to the parent service in book/page.tsx's toggle
  // handler. We render add-ons indented beneath their parent with a
  // "+ Add-on" badge so the relationship is clear.
  isAddOn?: boolean;
}

function rowKey(s: Service) {
  return s.variantId ? `${s.id}:${s.variantId}` : s.id;
}

// Surface the most-booked categories first so customers land on
// what they came for. Facial Services is a niche add-on and gets
// pushed to the end. Keep this in sync with Services.tsx so the
// marketing menu and the booking flow agree on order.
const CATEGORY_ORDER = ["Haircuts", "Color", "Styling", "Treatments", "Facial Services"];

// Mirrors HaircutsGallery's subcategory ordering: Unisex first
// (broadest appeal), then Women's, then Men's. Anything tagged with
// a value not in this list slots in alphabetically after the known
// ones; null/missing tags fall into a "" bucket that renders without
// a sub-header at the bottom of the category panel.
const SUBCATEGORY_ORDER = ["Unisex", "Women's", "Men's"] as const;

function compareSubcategory(a: string, b: string): number {
  const ia = SUBCATEGORY_ORDER.indexOf(a as (typeof SUBCATEGORY_ORDER)[number]);
  const ib = SUBCATEGORY_ORDER.indexOf(b as (typeof SUBCATEGORY_ORDER)[number]);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

function groupBySubcategory(services: Service[]): Array<{ key: string; rows: Service[] }> {
  const buckets = new Map<string, Service[]>();
  for (const s of services) {
    const key = s.subcategory && s.subcategory.trim().length > 0 ? s.subcategory : "";
    const arr = buckets.get(key) ?? [];
    arr.push(s);
    buckets.set(key, arr);
  }
  // Untagged rows always render last so the structured groups lead.
  const keys = Array.from(buckets.keys()).sort((a, b) => {
    if (a === "" && b !== "") return 1;
    if (b === "" && a !== "") return -1;
    return compareSubcategory(a, b);
  });
  return keys.map((key) => ({ key, rows: buckets.get(key)! }));
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
  const categories = useMemo(() => {
    const available = Object.keys(services);
    const ordered = CATEGORY_ORDER.filter((c) => available.includes(c));
    const remainder = available
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remainder];
  }, [services]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const selectedKeys = new Set(selected.map(rowKey));

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
      <p className="text-navy/70 font-body text-sm text-center mb-8">
        Pick one or more — we&apos;ll book them back-to-back with your stylist.
      </p>

      <div className="space-y-2 max-w-2xl mx-auto pb-32">
        {categories.map((cat) => {
          const selectedInCat = services[cat].filter((s) => selectedKeys.has(rowKey(s))).length;
          return (
            <div key={cat} className="border border-navy/15 rounded-sm overflow-hidden bg-white">
              <button
                onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
                aria-expanded={openCategory === cat}
                aria-controls={`service-category-${cat.replace(/\s+/g, "-").toLowerCase()}`}
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
                  <span className="text-navy/70 text-xs font-body">
                    {services[cat].length} services
                  </span>
                  <motion.svg
                    animate={{ rotate: openCategory === cat ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    aria-hidden
                    className="w-4 h-4 text-navy/70"
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
                    id={`service-category-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                    role="region"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-navy/5">
                      {(() => {
                        const groups = groupBySubcategory(services[cat]);
                        // When every row in this category sits in a
                        // single bucket (the un-tagged "" key, OR the
                        // category genuinely only has one subcategory),
                        // we don't need sub-headers. That keeps the
                        // existing flat layout for every non-Haircuts
                        // category as-is.
                        const showSubHeaders = groups.length > 1;
                        return groups.flatMap((group) => {
                          const header = showSubHeaders && group.key ? (
                            <div
                              key={`subheader-${group.key}`}
                              className="bg-cream/40 px-6 py-2 border-b border-navy/8"
                            >
                              <p className="font-heading text-[13px] tracking-wider uppercase text-navy/70">
                                {group.key}
                              </p>
                            </div>
                          ) : null;
                          const rows = group.rows.map((service) => {
                            const isSelected = selectedKeys.has(rowKey(service));
                            const isAddOn = !!service.isAddOn;
                            const addOnPriceLabel = isAddOn
                              ? service.priceText.startsWith("+")
                                ? service.priceText
                                : `+${service.priceText}`
                              : service.priceText;
                            const addOnNameLabel = isAddOn && service.variantName
                              ? service.variantName
                              : service.name;
                            return (
                              <button
                                key={rowKey(service)}
                                type="button"
                                onClick={() => onToggle(service)}
                                aria-pressed={isSelected}
                                aria-label={`${isSelected ? "Remove" : "Select"} ${service.name}${service.priceText ? `, ${service.priceText}` : ""}`}
                                className={`w-full ${isAddOn ? "pl-12 pr-6 py-3" : "px-6 py-4"} flex items-center gap-4 text-left transition-all duration-200 ${
                                  isSelected
                                    ? "bg-rose/8 border-l-[3px] border-rose"
                                    : "hover:bg-cream/40 border-l-[3px] border-transparent"
                                } ${isAddOn ? "bg-cream/20" : ""}`}
                              >
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
                                <span className={`font-heading shrink-0 w-20 text-left ${isAddOn ? "text-gold/80 text-sm" : "text-gold text-base"}`}>
                                  {addOnPriceLabel}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`font-body text-sm ${isSelected ? "text-rose font-medium" : isAddOn ? "text-navy/80" : "text-navy"}`}>
                                      {addOnNameLabel}
                                    </p>
                                    {isAddOn && (
                                      <span className="text-[10px] font-body uppercase tracking-widest bg-gold/15 text-gold/90 px-1.5 py-0.5 rounded">
                                        Add-on
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-body text-xs text-navy/70 mt-0.5">
                                    {isAddOn ? `+${formatDuration(service.duration)}` : formatDuration(service.duration)}
                                  </p>
                                </div>
                              </button>
                            );
                          });
                          return header ? [header, ...rows] : rows;
                        });
                      })()}
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
              <p className="text-navy/70 text-sm font-body">No services selected yet</p>
            ) : (
              <>
                <p className="text-navy/70 text-xs font-body mb-0.5">
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
            className="bg-rose hover:bg-rose-light disabled:opacity-40 disabled:cursor-not-allowed text-white tracking-widest uppercase text-sm px-7 py-3 min-h-[44px] transition-colors font-body shrink-0"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
