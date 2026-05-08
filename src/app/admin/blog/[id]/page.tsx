"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BlogPostEditor, { type BlogPostFormValue } from "@/components/admin/BlogPostEditor";

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [initial, setInitial] = useState<Partial<BlogPostFormValue> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/blog/posts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setInitial({
          id: data.id,
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt ?? "",
          content_md: data.content_md,
          cover_image_url: data.cover_image_url ?? "",
          cover_image_alt: data.cover_image_alt ?? "",
          category_id: data.category_id ?? "",
          author_name: data.author_name,
          status: data.status,
          published_at: data.published_at,
          scheduled_for: data.scheduled_for,
          meta_title: data.meta_title ?? "",
          meta_description: data.meta_description ?? "",
          canonical_url: data.canonical_url ?? "",
          og_image_url: data.og_image_url ?? "",
          tags: data.tags ?? [],
          is_featured: !!data.is_featured,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <div className="p-8 text-red-600">Failed to load: {error}</div>;
  if (!initial) return <div className="p-8 text-navy/70">Loading…</div>;
  return <BlogPostEditor postId={id} initial={initial} />;
}
