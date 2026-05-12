import Link from "next/link";

// Shared visible breadcrumb UI used across service-item, neighborhood,
// services-category, blog, and any other non-home page. The matching
// BreadcrumbList JSON-LD is emitted separately by each page via
// breadcrumbJsonLd() in @/lib/seo — keeping the visible trail and the
// structured-data emission in the same caller makes it impossible to
// drift between them.
//
// Items render left-to-right; the last item is always plain text
// (the current page), regardless of whether `href` is set on it,
// matching Google's "current page is not a link" guidance.

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (!items.length) return null;
  const lastIndex = items.length - 1;
  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-xs font-body text-navy/70 ${className ?? ""}`}
    >
      <ol className="flex flex-wrap items-center">
        {items.map((item, i) => {
          const isLast = i === lastIndex;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center">
              {isLast || !item.href ? (
                <span
                  className={isLast ? "text-navy/70" : ""}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-navy">
                  {item.label}
                </Link>
              )}
              {!isLast && <span className="mx-2" aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
