"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminToast from "@/components/admin/AdminToast";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";

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

// Review-badge counts shown on the public homepage (the "4.2 ★ ·
// 830+ Yelp reviews" card pair). Owner pastes the current numbers
// from Yelp Biz / Google Business once a month. Persisted via the
// same /api/admin/branding endpoint as the image slots — no need
// for a separate API.
interface ReviewBadgeField {
  key: string;
  label: string;
  hint?: string;
  kind: "rating" | "total";
  source: "Yelp" | "Google";
}
const REVIEW_KEYS = ["yelp_rating", "yelp_total", "google_rating", "google_total"];
const REVIEW_FIELDS: ReviewBadgeField[] = [
  { key: "yelp_rating",   label: "Yelp rating",        kind: "rating", source: "Yelp",
    hint: "0-5, one decimal place. Read off your Yelp Biz dashboard." },
  { key: "yelp_total",    label: "Yelp review count",  kind: "total",  source: "Yelp",
    hint: "Total reviews shown on your Yelp listing." },
  { key: "google_rating", label: "Google rating",       kind: "rating", source: "Google",
    hint: "0-5, one decimal place. Read off your Google Business app." },
  { key: "google_total",  label: "Google review count", kind: "total",  source: "Google",
    hint: "Total reviews shown on your Google Business profile." },
];

export default function BrandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/branding");
      if (res.ok) {
        const data = (await res.json()) as Record<string, string | null>;
        const cleaned: Record<string, string> = {};
        for (const slot of SLOTS) {
          cleaned[slot.key] = (data[slot.key] || "").trim();
        }
        // Review badge counts share the same /api/admin/branding
        // endpoint. Pull them out alongside the image slots so
        // the bottom card on this page can render their current
        // values without a second round-trip.
        for (const k of REVIEW_KEYS) {
          cleaned[k] = (data[k] || "").trim();
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

      {/* Owner-curated review badge counts. Yelp Fusion + Google
          Places APIs are paid / quota-throttled, so instead of
          syncing live we let the owner paste fresh values from
          their Biz / Business dashboards into these inputs once a
          month. The public homepage badge cards render whatever's
          stored. Each input persists individually on Save so
          partial updates don't lose the others. */}
      {!loading && (
        <div className="mt-12">
          <div className="mb-3">
            <Eyebrow>Review badges</Eyebrow>
            <h2 className="mt-1 font-heading text-2xl text-[var(--color-text)]">
              Yelp + Google rating &amp; review count
            </h2>
            <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2 max-w-2xl">
              These show on the public home page next to the badge cards (e.g.
              <em> 4.2 ★ · 830+ Yelp reviews</em>). Open Yelp Biz or your Google
              Business app, copy the current rating + review count, and paste
              them here. Empty falls back to the prior built-in value.
            </p>
          </div>
          <div className="bg-white border border-[var(--color-border)] p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {REVIEW_FIELDS.map((field) => {
              const current = values[field.key] || "";
              const draftValue = draft[field.key] ?? "";
              const dirty = (draftValue || "") !== (current || "");
              // Per-source placeholders mirror the actual public-
              // site fallback values for that source so the hint
              // matches reality. Round-14 QA flagged this as P3.
              const placeholder =
                field.source === "Yelp"
                  ? field.kind === "rating" ? "4.2" : "830"
                  : field.kind === "rating" ? "4.1" : "200";
              return (
                <div key={field.key}>
                  <label className="block text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-text-subtle)] mb-1">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={field.kind === "rating" ? "0.1" : "1"}
                      min="0"
                      max={field.kind === "rating" ? "5" : "100000"}
                      value={draftValue}
                      placeholder={placeholder}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="flex-1 border border-[var(--color-border)] px-3 py-2 text-sm font-body bg-white"
                    />
                    {dirty && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingKey === field.key}
                        onClick={() => saveSlot(field.key)}
                      >
                        Save
                      </Button>
                    )}
                  </div>
                  {field.hint && (
                    <p className="text-[0.6875rem] text-[var(--color-text-subtle)] mt-1">
                      {field.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-[var(--color-cream-50)] border border-[var(--color-border)] rounded-md p-5 sm:p-6">
            <Eyebrow>Home page service photos</Eyebrow>
            <h2 className="mt-1 font-heading text-2xl text-[var(--color-text)]">
              Photos come from individual services
            </h2>
            <p className="text-[0.875rem] text-[var(--color-text-muted)] mt-2 max-w-2xl">
              The four photo grids on the home page (Haircuts, Color, Styling,
              Treatments) are now driven directly by your <strong>services</strong> list.
              Each service&apos;s photo appears in its category grid, with the
              service&apos;s name as a caption. Click on any photo on the live site →
              the booking flow opens with that exact service preselected.
            </p>
            <p className="text-[0.875rem] text-[var(--color-text-muted)] mt-3 max-w-2xl">
              To add, replace, or reorder a photo in any of the home sections, edit
              the matching service in <a href="/admin/services" className="text-[var(--color-crimson-600)] underline">Services</a>{" "}
              — upload a new image, save, and the home page reflects it within a
              few seconds. Services without a photo are simply hidden from the
              home grid.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
