"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Eyebrow } from "@/components/ui/Card";
import { Segmented, SegmentedList, SegmentedItem } from "@/components/ui/Tabs";

interface GalleryItem {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
  sort_order: number;
  active: boolean;
}

interface BeforeAfterPair {
  id: string;
  before_url: string;
  after_url: string;
  caption: string | null;
  alt: string | null;
  sort_order: number;
  active: boolean;
}

type Toast = { type: "success" | "error"; message: string } | null;

// ────────────────────────────────────────────────────────────────────────
//  Upload helper — reuses the existing /api/admin/upload endpoint (extended
//  in this same PR to accept a `folder` param). Returns the public URL of
//  the stored image.
// ────────────────────────────────────────────────────────────────────────
async function uploadImage(file: File, folder: "gallery" | "before-after"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
  return data.url as string;
}

export default function AdminGalleryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"items" | "pairs">("items");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "item" | "pair"; id: string } | null>(null);
  const [uploadingItem, setUploadingItem] = useState(false);
  const [uploadingPairKind, setUploadingPairKind] = useState<null | "before" | "after">(null);
  const [pendingPair, setPendingPair] = useState<{ before_url?: string; after_url?: string; caption?: string; alt?: string }>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch("/api/admin/gallery/items").then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/gallery/pairs").then((r) => r.ok ? r.json() : []),
      ]);
      setItems(Array.isArray(a) ? a : []);
      setPairs(Array.isArray(b) ? b : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchAll();
  }, [status, fetchAll]);

  if (status !== "authenticated") return null;

  // ─── Gallery grid items ─────────────────────────────────────────────
  const handleItemUpload = async (file: File) => {
    setUploadingItem(true);
    try {
      const url = await uploadImage(file, "gallery");
      const res = await fetch("/api/admin/gallery/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save item.");
      }
      setToast({ type: "success", message: "Image added to gallery." });
      fetchAll();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploadingItem(false);
    }
  };

  const handleItemUpdate = async (id: string, patch: Partial<GalleryItem>) => {
    const res = await fetch("/api/admin/gallery/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed to save." });
      return;
    }
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const handleItemDelete = async (id: string) => {
    const res = await fetch(`/api/admin/gallery/items?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed to delete." });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setToast({ type: "success", message: "Removed from gallery." });
  };

  const moveItem = async (id: string, delta: number) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    const res = await fetch("/api/admin/gallery/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((i) => i.id) }),
    });
    if (!res.ok) {
      setToast({ type: "error", message: "Reorder failed — reload to sync." });
    }
  };

  // ─── Before / After pairs ───────────────────────────────────────────
  const handlePairFileUpload = async (kind: "before" | "after", file: File) => {
    setUploadingPairKind(kind);
    try {
      const url = await uploadImage(file, "before-after");
      setPendingPair((p) => ({ ...p, [`${kind}_url`]: url }));
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploadingPairKind(null);
    }
  };

  const submitPair = async () => {
    if (!pendingPair.before_url || !pendingPair.after_url) {
      setToast({ type: "error", message: "Upload both before and after images first." });
      return;
    }
    const res = await fetch("/api/admin/gallery/pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingPair),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed to save pair." });
      return;
    }
    setToast({ type: "success", message: "Before/after pair added." });
    setPendingPair({});
    fetchAll();
  };

  const handlePairUpdate = async (id: string, patch: Partial<BeforeAfterPair>) => {
    const res = await fetch("/api/admin/gallery/pairs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed to save." });
      return;
    }
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handlePairDelete = async (id: string) => {
    const res = await fetch(`/api/admin/gallery/pairs?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed to delete." });
      return;
    }
    setPairs((prev) => prev.filter((p) => p.id !== id));
    setToast({ type: "success", message: "Pair removed." });
  };

  const movePair = async (id: string, delta: number) => {
    const idx = pairs.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= pairs.length) return;
    const next = [...pairs];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPairs(next);
    const res = await fetch("/api/admin/gallery/pairs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((p) => p.id) }),
    });
    if (!res.ok) {
      setToast({ type: "error", message: "Reorder failed — reload to sync." });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <Eyebrow>Gallery</Eyebrow>
        <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">Manage gallery</h1>
        <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2">
          Upload images for the main gallery grid and before/after pairs. Changes publish to <code>/gallery</code> immediately.
        </p>
      </div>

      <div className="mb-6">
        <Segmented value={tab} onValueChange={(v) => setTab(v as "items" | "pairs")}>
          <SegmentedList>
            <SegmentedItem value="items">Gallery grid ({items.length})</SegmentedItem>
            <SegmentedItem value="pairs">Before / After ({pairs.length})</SegmentedItem>
          </SegmentedList>
        </Segmented>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading…</p>
      ) : tab === "items" ? (
        <div className="space-y-4">
          <label className="inline-flex items-center gap-2 bg-navy text-white text-sm font-body px-4 py-2 cursor-pointer hover:bg-navy/90">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingItem}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleItemUpload(f);
                e.target.value = "";
              }}
            />
            {uploadingItem ? "Uploading…" : "+ Add image"}
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, idx) => (
              <div key={item.id} className="bg-white border border-navy/10 p-3 flex gap-4">
                <div className="relative w-32 h-32 shrink-0 bg-navy/5">
                  <Image
                    src={item.image_url}
                    alt={item.title || "Gallery item"}
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized={item.image_url.startsWith("http")}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    defaultValue={item.title || ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (item.title || "")) handleItemUpdate(item.id, { title: v || null });
                    }}
                    className="w-full border border-navy/20 px-2 py-1 text-sm font-body"
                  />
                  <input
                    type="text"
                    placeholder="Caption / category (optional)"
                    defaultValue={item.caption || ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (item.caption || "")) handleItemUpdate(item.id, { caption: v || null });
                    }}
                    className="w-full border border-navy/20 px-2 py-1 text-sm font-body"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => moveItem(item.id, -1)}
                      disabled={idx === 0}
                      className="text-xs px-2 py-1 border border-navy/20 hover:bg-navy/5 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveItem(item.id, 1)}
                      disabled={idx === items.length - 1}
                      className="text-xs px-2 py-1 border border-navy/20 hover:bg-navy/5 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => handleItemUpdate(item.id, { active: e.target.checked })}
                      />
                      Active
                    </label>
                    <button
                      onClick={() => setConfirmDelete({ kind: "item", id: item.id })}
                      className="text-xs px-2 py-1 text-red-600 border border-red-200 hover:bg-red-50 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-navy/40 text-sm font-body col-span-full">No gallery images yet — upload one to get started.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* New-pair uploader */}
          <div className="bg-cream/40 border border-navy/10 p-4 space-y-3">
            <p className="font-body font-semibold text-sm">Add a new before/after pair</p>
            <div className="grid grid-cols-2 gap-3">
              {(["before", "after"] as const).map((kind) => {
                const url = pendingPair[`${kind}_url` as const];
                return (
                  <label
                    key={kind}
                    className="relative aspect-square border-2 border-dashed border-navy/20 flex items-center justify-center cursor-pointer hover:border-navy/40 bg-white"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPairKind !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePairFileUpload(kind, f);
                        e.target.value = "";
                      }}
                    />
                    {url ? (
                      <Image src={url} alt={kind} fill sizes="300px" className="object-cover" unoptimized={url.startsWith("http")} />
                    ) : (
                      <span className="text-navy/50 text-xs font-body uppercase tracking-widest">
                        {uploadingPairKind === kind ? "Uploading…" : `+ ${kind}`}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Caption (optional)"
              value={pendingPair.caption || ""}
              onChange={(e) => setPendingPair({ ...pendingPair, caption: e.target.value })}
              className="w-full border border-navy/20 px-2 py-1 text-sm font-body"
            />
            <input
              type="text"
              placeholder="Alt text for accessibility (optional)"
              value={pendingPair.alt || ""}
              onChange={(e) => setPendingPair({ ...pendingPair, alt: e.target.value })}
              className="w-full border border-navy/20 px-2 py-1 text-sm font-body"
            />
            <button
              onClick={submitPair}
              disabled={!pendingPair.before_url || !pendingPair.after_url}
              className="bg-navy text-white text-sm font-body px-4 py-2 disabled:opacity-40 hover:bg-navy/90"
            >
              Save pair
            </button>
          </div>

          {/* Existing pairs */}
          {pairs.map((pair, idx) => (
            <div key={pair.id} className="bg-white border border-navy/10 p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(["before", "after"] as const).map((kind) => {
                  const url = kind === "before" ? pair.before_url : pair.after_url;
                  return (
                    <div key={kind} className="relative aspect-square bg-navy/5">
                      <Image src={url} alt={kind} fill sizes="300px" className="object-cover" unoptimized={url.startsWith("http")} />
                      <span className="absolute top-1 left-1 bg-navy/80 text-white text-[10px] px-1.5 py-0.5 uppercase tracking-widest font-body">
                        {kind}
                      </span>
                    </div>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Caption"
                defaultValue={pair.caption || ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (pair.caption || "")) handlePairUpdate(pair.id, { caption: v || null });
                }}
                className="w-full border border-navy/20 px-2 py-1 text-sm font-body"
              />
              <input
                type="text"
                placeholder="Alt text"
                defaultValue={pair.alt || ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (pair.alt || "")) handlePairUpdate(pair.id, { alt: v || null });
                }}
                className="w-full border border-navy/20 px-2 py-1 text-sm font-body"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => movePair(pair.id, -1)}
                  disabled={idx === 0}
                  className="text-xs px-2 py-1 border border-navy/20 hover:bg-navy/5 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => movePair(pair.id, 1)}
                  disabled={idx === pairs.length - 1}
                  className="text-xs px-2 py-1 border border-navy/20 hover:bg-navy/5 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <label className="text-xs flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pair.active}
                    onChange={(e) => handlePairUpdate(pair.id, { active: e.target.checked })}
                  />
                  Active
                </label>
                <button
                  onClick={() => setConfirmDelete({ kind: "pair", id: pair.id })}
                  className="text-xs px-2 py-1 text-red-600 border border-red-200 hover:bg-red-50 ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {pairs.length === 0 && (
            <p className="text-navy/40 text-sm font-body">No before/after pairs yet — upload a before and after image above, then save.</p>
          )}
        </div>
      )}

      {toast ? <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.kind === "item" ? "Delete image?" : "Delete pair?"}
          message="This cannot be undone. The public /gallery page will update within the minute."
          confirmLabel="Delete"
          onConfirm={async () => {
            const { kind, id } = confirmDelete;
            setConfirmDelete(null);
            if (kind === "item") await handleItemDelete(id);
            else await handlePairDelete(id);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
