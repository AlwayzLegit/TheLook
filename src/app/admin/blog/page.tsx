"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published" | "archived";
  published_at: string | null;
  scheduled_for: string | null;
  updated_at: string;
  category: { id: string; slug: string; name: string } | null;
  is_featured: boolean;
  reading_time_minutes: number | null;
}
interface CategoryRow { id: string; name: string; slug: string; }

const STATUS_BADGE: Record<PostRow["status"], { label: string; tone: "neutral" | "info" | "success" | "warning" }> = {
  draft:     { label: "Draft",     tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "info" },
  published: { label: "Published", tone: "success" },
  archived:  { label: "Archived",  tone: "warning" },
};

// The public read query treats `scheduled AND scheduled_for <= now()`
// the same as `published`, so once a scheduled post's clock elapses
// it's effectively live on the site even though the DB row's status
// column still says "scheduled" until someone manually re-saves it.
// Without this helper the admin list keeps showing a blue "Scheduled"
// badge for posts that are already public — confusing if the operator
// sees a post on /blog but its admin row says "Scheduled".
//
// We don't write the database here. A separate cron promoting the
// row's status to "published" would be more authoritative; this is
// the cheap UX-only fix (cowork QA 2026-05-09).
function effectiveStatus(p: PostRow): PostRow["status"] {
  if (
    p.status === "scheduled" &&
    p.scheduled_for &&
    Date.parse(p.scheduled_for) <= Date.now()
  ) {
    return "published";
  }
  return p.status;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PostRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (statusFilter) sp.set("status", statusFilter);
    if (categoryFilter) sp.set("category_id", categoryFilter);
    if (search) sp.set("q", search);
    sp.set("limit", "100");
    try {
      const r = await fetch(`/api/admin/blog/posts?${sp.toString()}`);
      const data = await r.json();
      setPosts(data?.posts || []);
    } catch {
      setToast({ message: "Failed to load posts", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/blog/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const onDelete = async (post: PostRow) => {
    try {
      const r = await fetch(`/api/admin/blog/posts/${post.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setToast({ message: `Deleted “${post.title}”`, type: "success" });
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      setToast({ message: "Failed to delete post", type: "error" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const togglePublish = async (post: PostRow) => {
    // Drive the toggle off effective status, not the literal DB value.
    // For a scheduled-with-time-passed row the badge reads "Published"
    // and the button reads "Unpublish" — clicking it must put the row
    // in draft, not flip it from "scheduled" to "published" (the
    // outcome the literal-status branch would have given). Without
    // this the label and the action diverge for that one edge case.
    const eff = effectiveStatus(post);
    const next = eff === "published" ? "draft" : "published";
    try {
      const r = await fetch(`/api/admin/blog/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error();
      setToast({ message: next === "published" ? "Published" : "Reverted to draft", type: "success" });
      load();
    } catch {
      setToast({ message: "Failed to update status", type: "error" });
    }
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl mb-1">Blog</h1>
          <p className="text-navy/70 text-sm font-body">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/blog/categories"
            className="border border-navy/20 hover:border-navy/40 px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-body"
          >
            Categories
          </Link>
          <Link
            href="/admin/blog/new"
            className="bg-rose hover:bg-rose-light text-white px-5 py-2 text-[11px] tracking-[0.2em] uppercase font-body"
          >
            New post
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-white border border-navy/10 px-4 py-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or slug…"
          className="flex-1 min-w-[200px] border border-navy/15 px-3 py-2 text-sm font-body"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-navy/15 px-3 py-2 text-sm font-body bg-white"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-navy/15 px-3 py-2 text-sm font-body bg-white"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-navy/70 text-sm py-12 text-center">Loading…</p>
      ) : posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Write your first post to start ranking on long-tail hair queries."
          action={<Link href="/admin/blog/new" className="bg-rose hover:bg-rose-light text-white px-5 py-2 text-[11px] tracking-[0.2em] uppercase font-body">New post</Link>}
        />
      ) : (
        <div className="bg-white border border-navy/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy/5 text-navy/70 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Published</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Updated</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/8">
              {posts.map((p) => {
                const eff = effectiveStatus(p);
                const sb = STATUS_BADGE[eff];
                return (
                  <tr key={p.id} className="hover:bg-cream/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/blog/${p.id}`} className="font-medium text-navy hover:text-rose">
                        {p.title}
                      </Link>
                      {p.is_featured && (
                        <Badge tone="accent" size="sm" className="ml-2">Featured</Badge>
                      )}
                      <p className="text-navy/70 text-xs mt-0.5 font-mono">/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-navy/70">
                      {p.category?.name || <span className="text-navy/70">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={sb.tone} size="sm">{sb.label}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-navy/70 text-xs">
                      {p.status === "scheduled" && eff === "scheduled"
                        ? `→ ${fmt(p.scheduled_for)}`
                        : fmt(p.published_at ?? p.scheduled_for)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-navy/70 text-xs">
                      {fmt(p.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => togglePublish(p)}
                          className="text-xs px-3 py-1.5 border border-navy/20 hover:border-navy/40 transition-colors"
                        >
                          {eff === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <Link
                          href={`/admin/blog/${p.id}`}
                          className="text-xs px-3 py-1.5 border border-navy/20 hover:border-navy/40 transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="text-xs px-3 py-1.5 border border-red-300 text-red-600 hover:border-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this post?"
          message={`“${confirmDelete.title}” will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {toast && <AdminToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
