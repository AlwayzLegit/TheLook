import { z } from "zod";

// Slug rules: kebab-case, 1-128 chars, [a-z0-9-]. Loose enough to
// accept SEO slugs Claude routines emit; strict enough to fit a URL
// without escaping.
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const blogStatusSchema = z.enum(["draft", "scheduled", "published", "archived"]);

export const blogCategoryWriteSchema = z.object({
  slug: z.string().min(1).max(128).regex(slugRe, "Slug must be kebab-case lowercase letters/numbers/dashes"),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  cover_image_url: z.string().url().max(2000).nullable().optional(),
  meta_title: z.string().max(200).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
});
export type BlogCategoryWrite = z.infer<typeof blogCategoryWriteSchema>;

// Most fields nullable so a Claude routine can post a minimal body
// (slug + title + content_md + category_id + status) and let the DB
// fill defaults / triggers fill reading_time. status='published'
// without published_at gets stamped server-side in the route.
export const blogPostWriteSchema = z.object({
  slug: z.string().min(1).max(160).regex(slugRe, "Slug must be kebab-case"),
  title: z.string().min(1).max(300),
  excerpt: z.string().max(800).nullable().optional(),
  content_md: z.string().min(1).max(200_000),
  cover_image_url: z.string().url().max(2000).nullable().optional(),
  cover_image_alt: z.string().max(300).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  // Category slug can be sent instead of UUID for routine ergonomics.
  category_slug: z.string().min(1).max(128).regex(slugRe).nullable().optional(),
  author_name: z.string().min(1).max(200).optional(),
  author_avatar_url: z.string().url().max(2000).nullable().optional(),
  status: blogStatusSchema.optional(),
  published_at: z.string().datetime().nullable().optional(),
  scheduled_for: z.string().datetime().nullable().optional(),
  meta_title: z.string().max(200).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  canonical_url: z.string().url().max(2000).nullable().optional(),
  og_image_url: z.string().url().max(2000).nullable().optional(),
  reading_time_minutes: z.number().int().min(1).max(1000).nullable().optional(),
  tags: z.array(z.string().min(1).max(60)).max(20).optional(),
  is_featured: z.boolean().optional(),
});
export type BlogPostWrite = z.infer<typeof blogPostWriteSchema>;

// PATCH: same shape but every field optional and at least one must
// be present so an empty body doesn't no-op silently.
export const blogPostPatchSchema = blogPostWriteSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  "At least one field is required",
);
export const blogCategoryPatchSchema = blogCategoryWriteSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  "At least one field is required",
);
