"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import ImageUpload from "@/components/admin/ImageUpload";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  active: boolean;
}

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function BlogCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CategoryRow | null>(null);

  // New category form
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCover, setNewCover] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/blog/categories");
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSlug) return;
    try {
      const r = await fetch("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug,
          name: newName,
          description: newDesc || null,
          cover_image_url: newCover || null,
          sort_order: rows.length,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.error || `HTTP ${r.status}`);
      }
      setToast({ message: "Category added", type: "success" });
      setNewName(""); setNewSlug(""); setNewDesc(""); setNewCover(""); setAutoSlug(true);
      await load();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed", type: "error" });
    }
  };

  const updateRow = async (id: string, patch: Partial<CategoryRow>) => {
    try {
      const r = await fetch(`/api/admin/blog/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error();
      await load();
    } catch {
      setToast({ message: "Save failed", type: "error" });
    }
  };

  const onDelete = async (cat: CategoryRow) => {
    try {
      const r = await fetch(`/api/admin/blog/categories/${cat.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setToast({ message: `Deleted “${cat.name}”`, type: "success" });
      setRows((p) => p.filter((c) => c.id !== cat.id));
    } catch {
      setToast({ message: "Delete failed", type: "error" });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/blog" className="text-sm text-navy/70 hover:text-navy">← Back to posts</Link>
      </div>
      <h1 className="font-heading text-3xl mb-6">Blog Categories</h1>

      {/* New */}
      <form onSubmit={onCreate} className="bg-white border border-navy/10 p-5 mb-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (autoSlug) setNewSlug(slugify(e.target.value));
            }}
            placeholder="Color Trends"
            required
            className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Slug</label>
          <input
            type="text"
            value={newSlug}
            onChange={(e) => { setAutoSlug(false); setNewSlug(e.target.value); }}
            placeholder="color-trends"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
            className="w-full border border-navy/15 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Description</label>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="A short intro shown on the category landing page"
            rows={2}
            className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
          />
        </div>
        <div className="sm:col-span-2">
          <ImageUpload
            value={newCover}
            onChange={setNewCover}
            folder="blog"
            name={newSlug || newName || "category"}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="bg-rose hover:bg-rose-light text-white px-5 py-2 text-[11px] tracking-[0.2em] uppercase font-body"
          >
            Add category
          </button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-navy/70 text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <CategoryRowEditor
              key={c.id}
              row={c}
              onSave={(patch) => updateRow(c.id, patch)}
              onDelete={() => setConfirmDelete(c)}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this category?"
          message={`“${confirmDelete.name}” will be removed. Any posts in it lose their category badge but stay published.`}
          confirmLabel="Delete"
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {toast && <AdminToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function CategoryRowEditor({
  row, onSave, onDelete,
}: {
  row: CategoryRow;
  onSave: (patch: Partial<CategoryRow>) => Promise<void>;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(row);
  useEffect(() => setVal(row), [row]);
  const dirty =
    val.name !== row.name ||
    val.slug !== row.slug ||
    val.description !== row.description ||
    val.cover_image_url !== row.cover_image_url ||
    val.meta_title !== row.meta_title ||
    val.meta_description !== row.meta_description ||
    val.sort_order !== row.sort_order ||
    val.active !== row.active;

  return (
    <div className="bg-white border border-navy/10">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 text-left flex items-center gap-3"
        >
          <span className="font-heading text-base">{row.name}</span>
          <span className="text-xs font-mono text-navy/70">/{row.slug}</span>
          {!row.active && <span className="text-xs text-navy/70">(hidden)</span>}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="text-xs px-3 py-1.5 border border-red-300 text-red-600 hover:border-red-500"
          >
            Delete
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-navy/8 px-4 py-4 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-navy/70 mb-1">Name</label>
            <input value={val.name} onChange={(e) => setVal({ ...val, name: e.target.value })}
              className="w-full border border-navy/15 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-navy/70 mb-1">Slug</label>
            <input value={val.slug} onChange={(e) => setVal({ ...val, slug: e.target.value })}
              className="w-full border border-navy/15 px-3 py-2 text-sm font-mono" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-navy/70 mb-1">Description</label>
            <textarea value={val.description ?? ""} rows={2}
              onChange={(e) => setVal({ ...val, description: e.target.value })}
              className="w-full border border-navy/15 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <ImageUpload
              value={val.cover_image_url || ""}
              onChange={(url) => setVal({ ...val, cover_image_url: url || null })}
              folder="blog"
              name={val.slug}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-navy/70 mb-1">Meta title</label>
            <input value={val.meta_title ?? ""} onChange={(e) => setVal({ ...val, meta_title: e.target.value })}
              className="w-full border border-navy/15 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-navy/70 mb-1">Sort order</label>
            <input type="number" value={val.sort_order}
              onChange={(e) => setVal({ ...val, sort_order: Number(e.target.value) || 0 })}
              className="w-full border border-navy/15 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-navy/70 mb-1">Meta description</label>
            <textarea value={val.meta_description ?? ""} rows={2}
              onChange={(e) => setVal({ ...val, meta_description: e.target.value })}
              className="w-full border border-navy/15 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={val.active}
                onChange={(e) => setVal({ ...val, active: e.target.checked })} />
              <span>Active</span>
            </label>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => onSave({
                name: val.name, slug: val.slug, description: val.description,
                cover_image_url: val.cover_image_url, meta_title: val.meta_title,
                meta_description: val.meta_description, sort_order: val.sort_order,
                active: val.active,
              })}
              className="bg-rose hover:bg-rose-light disabled:opacity-40 text-white px-5 py-2 text-[11px] tracking-[0.2em] uppercase"
            >
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
