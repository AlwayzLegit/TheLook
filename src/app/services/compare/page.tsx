"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Service {
  id: string;
  name: string;
  category: string;
  price_text: string;
  price_min?: number;
  duration: number;
  image_url?: string | null;
}

export default function CompareServicesPage() {
  const [services, setServices] = useState<Record<string, Service[]>>({});
  const [selected, setSelected] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") setServices(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleService = (s: Service) => {
    if (selected.find((sel) => sel.id === s.id)) {
      setSelected(selected.filter((sel) => sel.id !== s.id));
    } else if (selected.length < 3) {
      setSelected([...selected, s]);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <Link href="/services" className="text-xs text-navy/40 hover:text-navy font-body mb-4 inline-block">&larr; All Services</Link>
          <div className="text-center mb-10">
            <h1 className="font-heading text-4xl md:text-5xl mb-3">Compare Services</h1>
            <p className="text-navy/50 font-body text-sm">Pick up to 3 services to compare side-by-side</p>
          </div>

          {/* Comparison table */}
          {selected.length > 0 && (
            <div className="bg-white border border-navy/10 mb-10 overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="bg-cream/50">
                  <tr>
                    <th className="text-left p-4 text-navy/40 text-xs uppercase tracking-wide">Feature</th>
                    {selected.map((s) => (
                      <th key={s.id} className="text-left p-4 font-heading text-base">
                        <div className="flex items-start justify-between gap-2">
                          <span>{s.name}</span>
                          <button onClick={() => toggleService(s)} className="text-navy/30 hover:text-navy text-xl leading-none">×</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/5">
                  <tr>
                    <td className="p-4 text-navy/50">Category</td>
                    {selected.map((s) => <td key={s.id} className="p-4">{s.category}</td>)}
                  </tr>
                  <tr>
                    <td className="p-4 text-navy/50">Starting Price</td>
                    {selected.map((s) => <td key={s.id} className="p-4 font-heading text-rose">{s.price_text}</td>)}
                  </tr>
                  <tr>
                    <td className="p-4 text-navy/50">Duration</td>
                    {selected.map((s) => <td key={s.id} className="p-4">{s.duration} minutes</td>)}
                  </tr>
                  <tr>
                    <td className="p-4"></td>
                    {selected.map((s) => (
                      <td key={s.id} className="p-4">
                        <Link href={`/book?service=${s.id}`} className="inline-block bg-rose hover:bg-rose-light text-white text-[10px] tracking-[0.2em] uppercase px-5 py-2 font-body">Book This</Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Service picker */}
          {loading ? (
            <p className="text-navy/40 text-center font-body">Loading...</p>
          ) : (
            <div className="space-y-8">
              {Object.entries(services).map(([category, items]) => (
                <div key={category}>
                  <h2 className="font-heading text-xl mb-4 pb-2 border-b border-navy/10">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((s) => {
                      const isSelected = selected.find((sel) => sel.id === s.id);
                      const canSelect = selected.length < 3 || isSelected;
                      return (
                        <button
                          key={s.id}
                          onClick={() => canSelect && toggleService(s)}
                          disabled={!canSelect}
                          className={`text-left p-4 border transition-all ${
                            isSelected
                              ? "border-rose bg-rose/5"
                              : canSelect
                                ? "border-navy/10 bg-white hover:border-navy/30"
                                : "border-navy/5 bg-white/50 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-body font-bold text-sm">{s.name}</p>
                            {isSelected && <span className="text-rose text-xs">✓</span>}
                          </div>
                          <div className="flex items-center justify-between text-xs font-body text-navy/50">
                            <span>{s.duration} min</span>
                            <span className="font-heading text-rose">{s.price_text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected.length === 0 && (
            <p className="text-navy/30 text-center text-xs font-body mt-8">Select any service above to start comparing</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
