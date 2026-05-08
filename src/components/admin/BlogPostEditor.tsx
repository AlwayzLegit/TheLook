"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminToast from "./AdminToast";
import ImageUpload from "./ImageUpload";

type Status = "draft" | "scheduled" | "published" | "archived";

export interface BlogPostFormValue {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_image_url: string;
  cover_image_alt: string;
  category_id: string;
  author_name: string;
  status: Status;
  published_at: string | null;
  scheduled_for: string | null;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  og_image_url: string;
  tags: string[];
  is_featured: boolean;
}

interface CategoryRow { id: string; slug: string; name: string; }

interface Props {
  initial?: Partial<BlogPostFormValue>;
  // When editing, the parent passes the post id; on create it's undefined
  // and we POST to the collection endpoint instead.
  postId?: string;
}

function emptyValue(): BlogPostFormValue {
  return {
    slug: "",
    title: "",
    excerpt: "",
    content_md: "",
    cover_image_url: "",
    cover_image_alt: "",
    category_id: "",
    author_name: "The Look Hair Salon",
    status: "draft",
    published_at: null,
    scheduled_for: null,
    meta_title: "",
    meta_description: "",
    canonical_url: "",
    og_image_url: "",
    tags: [],
    is_featured: false,
  };
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

// Datetime-local <input> needs the "YYYY-MM-DDTHH:MM" format without
// timezone. We round-trip ISO strings through this so saving works.
function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function BlogPostEditor({ initial, postId }: Props) {
  const router = useRouter();
  const [val, setVal] = useState<BlogPostFormValue>(() => ({
    ...emptyValue(),
    ...(initial || {}),
    tags: initial?.tags ?? [],
  }));
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [autoSlug, setAutoSlug] = useState(!initial?.slug);

  useEffect(() => {
    fetch("/api/admin/blog/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Auto-generate slug from title until the user types in the slug
  // field manually. Once they edit slug, we stop auto-syncing.
  useEffect(() => {
    if (!autoSlug) return;
    setVal((v) => ({ ...v, slug: slugify(v.title) }));
  }, [val.title, autoSlug]);

  // Live preview — debounced markdown render against the public API.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!val.content_md.trim()) { setPreviewHtml(""); return; }
      try {
        const r = await fetch("/api/admin/blog/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ md: val.content_md }),
        });
        if (!r.ok) return;
        const data = await r.json();
        setPreviewHtml(data?.html || "");
      } catch { /* ignore preview errors */ }
    }, 300);
    return () => clearTimeout(t);
  }, [val.content_md]);

  const wordCount = useMemo(() => {
    return val.content_md.trim().split(/\s+/).filter(Boolean).length;
  }, [val.content_md]);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);

    // Parse tags from comma-separated input
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    const body = {
      slug: val.slug,
      title: val.title,
      excerpt: val.excerpt || null,
      content_md: val.content_md,
      cover_image_url: val.cover_image_url || null,
      cover_image_alt: val.cover_image_alt || null,
      category_id: val.category_id || null,
      author_name: val.author_name || "The Look Hair Salon",
      status: val.status,
      published_at: val.published_at,
      scheduled_for: val.status === "scheduled" ? val.scheduled_for : null,
      meta_title: val.meta_title || null,
      meta_description: val.meta_description || null,
      canonical_url: val.canonical_url || null,
      og_image_url: val.og_image_url || null,
      tags,
      is_featured: val.is_featured,
    };

    try {
      const url = postId
        ? `/api/admin/blog/posts/${postId}`
        : "/api/admin/blog/posts";
      const method = postId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data?.error || `Save failed (HTTP ${r.status}).`);
        return;
      }
      const saved = await r.json();
      setToast({ message: postId ? "Saved" : "Created", type: "success" });
      // On create, jump to the edit URL so further saves PATCH instead
      // of POSTing duplicates.
      if (!postId && saved?.id) router.push(`/admin/blog/${saved.id}`);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/blog" className="text-sm text-navy/70 hover:text-navy">← Back to posts</Link>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="space-y-6">
          {/* Title + slug */}
          <div className="bg-white border border-navy/10 p-5">
            <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Title</label>
            <input
              type="text"
              value={val.title}
              onChange={(e) => setVal({ ...val, title: e.target.value })}
              placeholder="Post title"
              required
              className="w-full text-2xl font-heading mb-4 border-b border-navy/15 pb-2 focus:outline-none focus:border-rose"
            />
            <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-navy/70 text-sm font-mono">/blog/</span>
              <input
                type="text"
                value={val.slug}
                onChange={(e) => { setAutoSlug(false); setVal({ ...val, slug: e.target.value }); }}
                placeholder="my-post-slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                title="Lowercase letters, numbers, dashes only"
                required
                className="flex-1 border border-navy/15 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {/* Markdown body + live preview */}
          <div className="bg-white border border-navy/10">
            <div className="flex items-center justify-between border-b border-navy/8 px-4 py-2">
              <p className="text-xs uppercase tracking-wider text-navy/70 font-body">Body — Markdown</p>
              <p className="text-xs text-navy/70 font-body">
                {wordCount.toLocaleString()} words · ~{readingMinutes} min read
              </p>
            </div>
            <div className="grid md:grid-cols-2 divide-x divide-navy/8">
              <textarea
                value={val.content_md}
                onChange={(e) => setVal({ ...val, content_md: e.target.value })}
                placeholder="# Your post in markdown…"
                rows={28}
                className="block w-full px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none resize-y"
                required
              />
              <div
                className="blog-content px-5 py-4 text-sm leading-relaxed overflow-y-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: previewHtml || "<p class='text-navy/40 italic'>Preview appears here.</p>" }}
              />
            </div>
          </div>

          {/* SEO + meta overrides */}
          <details className="bg-white border border-navy/10">
            <summary className="cursor-pointer px-5 py-3 font-body text-navy/70 text-sm">
              SEO overrides
            </summary>
            <div className="px-5 py-4 space-y-4 border-t border-navy/8">
              <div>
                <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Meta title</label>
                <input
                  type="text"
                  value={val.meta_title}
                  onChange={(e) => setVal({ ...val, meta_title: e.target.value })}
                  placeholder={val.title ? `${val.title} | The Look Hair Salon` : "Defaults to title"}
                  className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Meta description</label>
                <textarea
                  value={val.meta_description}
                  onChange={(e) => setVal({ ...val, meta_description: e.target.value })}
                  placeholder="Defaults to excerpt"
                  rows={3}
                  className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Canonical URL</label>
                <input
                  type="url"
                  value={val.canonical_url}
                  onChange={(e) => setVal({ ...val, canonical_url: e.target.value })}
                  placeholder="Defaults to /blog/<slug>"
                  className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">OG image URL</label>
                <input
                  type="url"
                  value={val.og_image_url}
                  onChange={(e) => setVal({ ...val, og_image_url: e.target.value })}
                  placeholder="Defaults to cover image"
                  className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
                />
              </div>
            </div>
          </details>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Publish controls */}
          <div className="bg-white border border-navy/10 p-5">
            <p className="text-xs uppercase tracking-wider text-navy/70 font-body mb-3">Status</p>
            <select
              value={val.status}
              onChange={(e) => setVal({ ...val, status: e.target.value as Status })}
              className="w-full border border-navy/15 px-3 py-2 text-sm font-body bg-white mb-3"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            {val.status === "scheduled" && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Publish at</label>
                <input
                  type="datetime-local"
                  value={isoToLocal(val.scheduled_for)}
                  onChange={(e) => setVal({ ...val, scheduled_for: localToIso(e.target.value) })}
                  className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
                />
              </div>
            )}

            {val.status === "published" && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Published at</label>
                <input
                  type="datetime-local"
                  value={isoToLocal(val.published_at)}
                  onChange={(e) => setVal({ ...val, published_at: localToIso(e.target.value) })}
                  className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
                />
                <p className="text-xs text-navy/50 mt-1 font-body">Leave blank to use now.</p>
              </div>
            )}

            <label className="mt-4 flex items-center gap-2 text-sm font-body">
              <input
                type="checkbox"
                checked={val.is_featured}
                onChange={(e) => setVal({ ...val, is_featured: e.target.checked })}
              />
              <span>Featured post</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full bg-rose hover:bg-rose-light disabled:opacity-50 text-white px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase font-body"
            >
              {saving ? "Saving…" : postId ? "Save changes" : "Create post"}
            </button>
            {error && <p className="mt-3 text-red-600 text-xs font-body">{error}</p>}
            {postId && val.slug ? (
              <Link
                href={`/blog/${val.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs text-navy/70 hover:text-navy"
              >
                View on site ↗
              </Link>
            ) : null}
          </div>

          {/* Category */}
          <div className="bg-white border border-navy/10 p-5">
            <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Category</label>
            <select
              value={val.category_id}
              onChange={(e) => setVal({ ...val, category_id: e.target.value })}
              className="w-full border border-navy/15 px-3 py-2 text-sm font-body bg-white"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Link
              href="/admin/blog/categories"
              className="block mt-2 text-xs text-navy/70 hover:text-navy"
            >
              Manage categories →
            </Link>
          </div>

          {/* Excerpt */}
          <div className="bg-white border border-navy/10 p-5">
            <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Excerpt</label>
            <textarea
              value={val.excerpt}
              onChange={(e) => setVal({ ...val, excerpt: e.target.value })}
              placeholder="Auto-generated from body if blank"
              rows={3}
              className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
            />
          </div>

          {/* Cover image */}
          <div className="bg-white border border-navy/10 p-5">
            <ImageUpload
              value={val.cover_image_url}
              onChange={(url) => setVal({ ...val, cover_image_url: url })}
              folder="blog"
              name={val.slug || val.title || "post"}
            />
            <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mt-3 mb-1">Cover alt text</label>
            <input
              type="text"
              value={val.cover_image_alt}
              onChange={(e) => setVal({ ...val, cover_image_alt: e.target.value })}
              placeholder="Describe the image for screen readers"
              className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
            />
          </div>

          {/* Tags */}
          <div className="bg-white border border-navy/10 p-5">
            <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="balayage, summer, root touch-up"
              className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
            />
            <p className="text-xs text-navy/50 mt-1 font-body">Comma-separated.</p>
          </div>

          {/* Author */}
          <div className="bg-white border border-navy/10 p-5">
            <label className="block text-xs uppercase tracking-wider text-navy/70 font-body mb-1">Author byline</label>
            <input
              type="text"
              value={val.author_name}
              onChange={(e) => setVal({ ...val, author_name: e.target.value })}
              placeholder="The Look Hair Salon"
              className="w-full border border-navy/15 px-3 py-2 text-sm font-body"
            />
          </div>
        </aside>
      </form>

      {toast && <AdminToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
