import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

// Markdown source-of-truth lives in blog_posts.content_md. We render
// it to sanitized HTML at request time and let Next ISR cache the
// resulting page. The pipeline:
//
//   parse markdown (with GFM tables/footnotes/strikethrough/task lists)
//     -> rehype HTML AST
//     -> slug each heading (id="my-heading")
//     -> autolink the heading anchor (so `#my-heading` works)
//     -> sanitize against XSS
//     -> stringify to HTML
//
// Sanitization is non-negotiable. Even though /admin/blog is a
// trusted authoring surface today, a Claude routine posting via the
// API could go off-script and emit `<script>` or `<iframe>` markup.
// We start from rehype-sanitize's defaultSchema (an allow-list close
// to GitHub's) and extend it just enough for what blog posts need:
// className on code blocks, target/rel on links, and id/data-* on
// the headings the slug plugin generates.

// hast-util-sanitize merges attribute rules per element, BUT it only
// honours one `["className", ...]` entry per element — duplicates
// silently drop the others. The default schema already declares
// `["className", "data-footnote-backref"]` on <a>, so naïvely
// appending our own `["className", "heading-anchor-link"]` produced
// `class=""` on the rendered anchor (heading-anchor-link was
// recognised as a className attribute but its value rejected). Strip
// the default rule and replace it with one that lists every
// className we need to keep allowed: GFM's footnote-backref class
// plus the anchor flavours we generate ourselves.
function withoutClassNameRule<T>(attrs: T[] | undefined): T[] {
  return (attrs ?? []).filter(
    (a) => !(Array.isArray(a) && a[0] === "className"),
  );
}

const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: [
      ...withoutClassNameRule(defaultSchema.attributes?.a),
      "target",
      "rel",
      "ariaLabel",
      [
        "className",
        "anchor",
        "header-anchor",
        "heading-anchor-link",
        "data-footnote-backref",
      ],
    ],
    code: [
      ...withoutClassNameRule(defaultSchema.attributes?.code),
      ["className", /^language-./],
    ],
    span: [
      ...withoutClassNameRule(defaultSchema.attributes?.span),
      ["className", /^hljs-/, "heading-anchor-icon"],
    ],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  // `behavior: "append"` puts the anchor link AFTER the heading text,
  // not around it — so the heading itself stays plain text and only
  // the small ¶ icon is the click target. The previous "wrap" pattern
  // turned every <h2>/<h3> into a clickable link with link styling
  // bleed-through, which read like an authoring mistake on the
  // reader's first impression. Hover-only ¶ visibility lives in
  // globals.css under `.heading-anchor-icon`.
  .use(rehypeAutolinkHeadings, {
    behavior: "append",
    properties: {
      className: ["heading-anchor-link"],
      ariaLabel: "Link to section",
    },
    content: {
      type: "element",
      tagName: "span",
      properties: { className: ["heading-anchor-icon"] },
      children: [{ type: "text", value: "¶" }],
    },
  })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  if (!md) return "";
  const file = await processor.process(md);
  return String(file);
}

// Strip markdown to plain text — used for excerpt fallback and
// search/SEO meta-description when the author left those blank.
export function stripMarkdown(md: string, max = 160): string {
  if (!md) return "";
  const text = md
    // remove code fences first (their bodies are noise)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    // strip image/link syntax, keeping link text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // headings, blockquotes, list markers, emphasis
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  // cut on a word boundary near max, then ellipsis
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export function readingTimeMinutes(md: string): number {
  if (!md) return 1;
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 220));
}
