"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";

interface HomeGalleryRow {
  id: string;
  section: HomeSection;
  image_url: string;
  alt: string | null;
  sort_order: number;
  active: boolean;
}

type HomeSection = "haircuts" | "color" | "styling" | "treatments";

const HOME_SECTIONS: Array<{ id: HomeSection; label: string; description: string }> = [
  {
    id: "haircuts",
    label: "Haircuts",
    description: "Photo grid in the Haircuts section on the public home page.",
  },
  {
    id: "color",
    label: "Color & Highlights",
    description: "Photo grid in the Color & Highlights section on the public home page.",
  },
  {
    id: "styling",
    label: "Styling",
    description: "Photo grid in the Styling section on the public home page.",
  },
  {
    id: "treatments",
    label: "Treatments",
    description: "Photo grid in the Treatments section on the public home page.",
  },
];

// Singular branding images (Phase 1). Each slot maps to a salon_settings
// key + a hardcoded fallback path the public site uses when the
// override is empty. Owner uploads once and the public surface picks
// it up on next render (BRANDING_CACHE_TAG is busted server-side).

interface Slot {
  key: string;
  label: string;
  description: string;
  fallback: string;
  // Suggested aspect for the upload preview. The public site
  // honours its own crop, so this is just a UX hint here.
  preview: "wide" | "square" | "portrait";
}

const SLOTS: Slot[] = [
  {
    key: "home_hero_url",
    label: "Home hero",
    description: "Top-of-page background photo on the public home page.",
    fallback: "/images/hero/salon-main.jpg",
    preview: "wide",
  },
  {
    key: "about_image_url",
    label: "About / Our Story photo",
    description: "Photo on the home page's About section, beside the salon story.",
    fallback: "/images/our-story.png",
    preview: "portrait",
  },
  {
    key: "footer_bg_url",
    label: "Footer background",
    description: "Subtle photo behind the dark footer on every page.",
    fallback: "/images/footer-hair-bg.png",
    preview: "wide",
  },
  {
    key: "cat_haircuts_hero_url",
    label: "Haircuts category hero",
    description: "Banner photo at the top of /services/haircuts.",
    fallback: "/images/Haircuts.jpg",
    preview: "wide",
  },
  {
    key: "cat_color_hero_url",
    label: "Color category hero",
    description: "Banner photo at the top of /services/color.",
    fallback: "/images/Highlights.jpg",
    preview: "wide",
  },
  {
    key: "cat_styling_hero_url",
    label: "Styling category hero",
    description: "Banner photo at the top of /services/styling.",
    fallback: "/images/Styling.jpg",
    preview: "wide",
  },
  {
    key: "cat_treatments_hero_url",
    label: "Treatments category hero",
    description: "Banner photo at the top of /services/treatments.",
    fallback: "/images/Treatments.jpg",
    preview: "wide",
  },
];

const PREVIEW_CLASS: Record<Slot["preview"], string> = {
  wide: "aspect-[16/9]",
  square: "aspect-square",
  portrait: "aspect-[4/5]",
};

export default function BrandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // Home-page gallery sections (Phase 2). One row per photo, grouped
  // client-side by section. Tabs let owner work on one section at a
  // time so the page doesn't render 30+ photos at once.
  const [galleryRows, setGalleryRows] = useState<HomeGalleryRow[]>([]);
  const [activeTab, setActiveTab] = useState<HomeSection>("haircuts");
  const [pendingUpload, setPendingUpload] = useState<{ section: HomeSection; url: string }>({
    section: "haircuts",
    url: "",
  });
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [brandingRes, galleryRes] = await Promise.all([
        fetch("/api/admin/branding"),
        fetch("/api/admin/branding/galleries"),
      ]);
      if (galleryRes.ok) {
        const g = (await galleryRes.json()) as { rows?: HomeGalleryRow[] };
        if (Array.isArray(g.rows)) setGalleryRows(g.rows);
      }
      if (brandingRes.ok) {
        const data = (await brandingRes.json()) as Record<string, string | null>;
        const cleaned: Record<string, string> = {};
        for (const slot of SLOTS) {
          cleaned[slot.key] = (data[slot.key] || "").trim();
        }
        setValues(cleaned);
        setDraft(cleaned);
      } else {
        setToast({ type: "error", message: "Failed to load branding." });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const saveSlot = async (slotKey: string) => {
    const next = draft[slotKey] ?? "";
    setSavingKey(slotKey);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [slotKey]: next }),
      });
      if (res.ok) {
        setValues((prev) => ({ ...prev, [slotKey]: next }));
        setToast({ type: "success", message: next ? "Image updated." : "Reset to default." });
      } else {
        const data = await res.json().catch(() => ({}));
        setToast({ type: "error", message: data.error || "Failed to save." });
      }
    } finally {
      setSavingKey(null);
    }
  };

  const resetSlot = async (slotKey: string) => {
    setDraft((prev) => ({ ...prev, [slotKey]: "" }));
    await saveSlot(slotKey);
    // saveSlot reads from draft; we already updated draft above so the
    // PATCH writes empty.
  };

  // ─── Home gallery section handlers ───────────────────────────────
  const galleryAdd = async (section: HomeSection, imageUrl: string) => {
    if (!imageUrl) return;
    const res = await fetch("/api/admin/branding/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, image_url: imageUrl }),
    });
    if (res.ok) {
      setToast({ type: "success", message: "Photo added." });
      setPendingUpload({ section, url: "" });
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setToast({ type: "error", message: d.error || "Failed to add photo." });
    }
  };

  const galleryDelete = async (id: string) => {
    const res = await fetch(`/api/admin/branding/galleries/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGalleryRows((prev) => prev.filter((r) => r.id !== id));
      setToast({ type: "success", message: "Photo removed." });
    } else {
      setToast({ type: "error", message: "Failed to delete." });
    }
  };

  const galleryToggleActive = async (row: HomeGalleryRow) => {
    const next = !row.active;
    setGalleryRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: next } : r)));
    const res = await fetch(`/api/admin/branding/galleries/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) {
      setGalleryRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: row.active } : r)));
      setToast({ type: "error", message: "Failed to toggle." });
    }
  };

  const galleryUpdateAlt = async (id: string, alt: string) => {
    setGalleryRows((prev) => prev.map((r) => (r.id === id ? { ...r, alt } : r)));
    await fetch(`/api/admin/branding/galleries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt }),
    });
  };

  const galleryMove = async (
    sectionRows: HomeGalleryRow[],
    index: number,
    direction: "up" | "down",
  ) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sectionRows.length) return;
    const reordered = [...sectionRows];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const newOrders = new Map(reordered.map((r, i) => [r.id, i]));
    setGalleryRows((prev) =>
      prev.map((r) => (newOrders.has(r.id) ? { ...r, sort_order: newOrders.get(r.id) ?? r.sort_order } : r)),
    );
    setReorderingId(sectionRows[index].id);
    try {
      const res = await fetch("/api/admin/branding/galleries/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((r) => r.id) }),
      });
      if (!res.ok) {
        setToast({ type: "error", message: "Reorder failed. Refreshing." });
        load();
      }
    } finally {
      setReorderingId(null);
    }
  };

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <Eyebrow>Branding</Eyebrow>
        <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">
          Site images
        </h1>
        <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2">
          Replace any of the photos below to update the public site. Empty / reset falls back to the
          built-in default. Changes show up on the live site within a few seconds.
        </p>
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] font-body">Loading…</p>
      ) : (
        <div className="space-y-8">
          {SLOTS.map((slot) => {
            const current = values[slot.key] || "";
            const draftValue = draft[slot.key] ?? "";
            const showsCustom = !!current;
            const dirty = (draftValue || "") !== (current || "");
            const previewSrc = draftValue || current || slot.fallback;
            return (
              <div key={slot.key} className="bg-white border border-[var(--color-border)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-heading text-lg">{slot.label}</p>
                    <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-0.5">
                      {slot.description}
                    </p>
                    <p className="text-[0.6875rem] text-[var(--color-text-subtle)] mt-1 font-mono">
                      {showsCustom ? "Custom photo active" : "Using built-in default"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {showsCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={savingKey === slot.key}
                        onClick={() => resetSlot(slot.key)}
                      >
                        Reset to default
                      </Button>
                    )}
                    {dirty && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingKey === slot.key}
                        onClick={() => saveSlot(slot.key)}
                      >
                        Save
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Live preview of whatever is currently saved (or
                      the fallback if nothing). */}
                  <div>
                    <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-text-subtle)] mb-2">
                      Preview
                    </p>
                    <div className={`relative ${PREVIEW_CLASS[slot.preview]} rounded-md overflow-hidden bg-[var(--color-cream-50)] border border-[var(--color-border)]`}>
                      <Image
                        src={previewSrc}
                        alt={slot.label}
                        fill
                        sizes="(max-width: 768px) 100vw, 480px"
                        className="object-cover"
                        unoptimized={!previewSrc.startsWith("/")}
                      />
                    </div>
                  </div>

                  {/* Upload control. Reuses the same ImageUpload that
                      stylists / services / gallery already use, so we
                      get the signed-URL direct-to-Supabase path for
                      free. */}
                  <div>
                    <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-text-subtle)] mb-2">
                      Replace
                    </p>
                    <ImageUpload
                      value={draftValue}
                      onChange={(url) => setDraft((prev) => ({ ...prev, [slot.key]: url }))}
                      name={`branding-${slot.key}`}
                      folder="staff"
                    />
                    {dirty && (
                      <p className="text-[0.7rem] font-body text-[var(--color-text-muted)] mt-2">
                        Click <strong>Save</strong> above to publish. Or use Reset to clear back to
                        the default.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Home page gallery sections (Phase 2) ───────────────────── */}
      {!loading && (
        <div className="mt-12">
          <div className="mb-6">
            <Eyebrow>Home page galleries</Eyebrow>
            <h2 className="mt-1 font-heading text-2xl text-[var(--color-text)]">
              Section photo grids
            </h2>
            <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2 max-w-2xl">
              Manage the photos that fill the four service sections on the public home page.
              First photo is the section&apos;s featured hero; the rest fill the grid below it.
              Empty sections fall back to the built-in stock photos.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-5 border-b border-[var(--color-border)]">
            {HOME_SECTIONS.map((s) => {
              const count = galleryRows.filter((r) => r.section === s.id).length;
              const isActive = activeTab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className={
                    "px-4 py-2 text-[0.8125rem] font-body border-b-2 -mb-px transition-colors " +
                    (isActive
                      ? "border-[var(--color-crimson-600)] text-[var(--color-text)]"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]")
                  }
                >
                  {s.label}
                  <span className="ml-2 text-[0.6875rem] text-[var(--color-text-subtle)]">({count})</span>
                </button>
              );
            })}
          </div>

          {(() => {
            const section = HOME_SECTIONS.find((s) => s.id === activeTab);
            if (!section) return null;
            const sectionRows = galleryRows
              .filter((r) => r.section === activeTab)
              .sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div className="bg-white border border-[var(--color-border)] p-5 sm:p-6 space-y-5">
                <p className="text-[0.8125rem] text-[var(--color-text-muted)]">
                  {section.description}
                </p>

                {/* Existing rows */}
                {sectionRows.length === 0 ? (
                  <p className="text-[0.8125rem] text-[var(--color-text-subtle)] italic">
                    No custom photos yet. Showing the built-in fallback set on the public site.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {sectionRows.map((row, idx) => (
                      <li
                        key={row.id}
                        className={
                          "flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-md " +
                          (row.active ? "" : "opacity-60")
                        }
                      >
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => galleryMove(sectionRows, idx, "up")}
                            disabled={idx === 0 || reorderingId === row.id}
                            aria-label="Move up"
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-cream-200)]/40 px-1.5 py-0.5 text-xs leading-none disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => galleryMove(sectionRows, idx, "down")}
                            disabled={idx === sectionRows.length - 1 || reorderingId === row.id}
                            aria-label="Move down"
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-cream-200)]/40 px-1.5 py-0.5 text-xs leading-none disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="relative w-20 h-20 shrink-0 rounded overflow-hidden bg-[var(--color-cream-50)]">
                          <Image
                            src={row.image_url}
                            alt={row.alt || ""}
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized={!row.image_url.startsWith("/")}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.6875rem] uppercase tracking-wider text-[var(--color-text-subtle)]">
                            {idx === 0 ? "Hero" : `Grid #${idx}`}
                          </p>
                          <input
                            type="text"
                            value={row.alt || ""}
                            placeholder="Alt text (e.g. Sun-kissed balayage)"
                            onChange={(e) => {
                              const v = e.target.value;
                              setGalleryRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, alt: v } : r)),
                              );
                            }}
                            onBlur={(e) => galleryUpdateAlt(row.id, e.target.value)}
                            className="w-full mt-1 border border-[var(--color-border)] px-2 py-1 text-sm font-body bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant={row.active ? "ghost" : "secondary"}
                            size="sm"
                            onClick={() => galleryToggleActive(row)}
                          >
                            {row.active ? "Hide" : "Show"}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirmDeleteId(row.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add new */}
                <div className="border-t border-[var(--color-border)] pt-5">
                  <p className="text-[0.875rem] font-body text-[var(--color-text)] mb-2">
                    Add a new photo to <strong>{section.label}</strong>
                  </p>
                  <ImageUpload
                    value={pendingUpload.section === activeTab ? pendingUpload.url : ""}
                    onChange={(url) => {
                      setPendingUpload({ section: activeTab, url });
                      if (url) galleryAdd(activeTab, url);
                    }}
                    name={`home-${activeTab}-${Date.now()}`}
                    folder="gallery"
                  />
                  <p className="text-[0.6875rem] text-[var(--color-text-subtle)] mt-2">
                    Upload a photo and it&apos;s added immediately. Use the arrows above to
                    reorder. The first photo in the list is the section&apos;s hero on the
                    public site.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete photo?"
          message="This removes the photo from the home page. The image file stays in storage and can be re-added later."
          onConfirm={() => {
            galleryDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {toast && (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
