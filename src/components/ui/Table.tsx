"use client";

import { forwardRef, useMemo, useState, type HTMLAttributes } from "react";
import { cn } from "./cn";

// Plain HTML table primitives — sort + row-hover + kebab room. Virtualization
// is handled separately by <VirtualTable> so the common case stays cheap.

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(function Table(
  { className, ...rest },
  ref,
) {
  return (
    <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
      <table ref={ref} className={cn("w-full border-collapse text-[0.8125rem]", className)} {...rest} />
    </div>
  );
});

export const THead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(function THead(
  { className, ...rest },
  ref,
) {
  return <thead ref={ref} className={cn("bg-[var(--color-cream-50)]", className)} {...rest} />;
});

export const TBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(function TBody(
  { className, ...rest },
  ref,
) {
  return <tbody ref={ref} className={className} {...rest} />;
});

export const Tr = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(function Tr(
  { className, ...rest },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-cream-50)]",
        className,
      )}
      {...rest}
    />
  );
});

interface ThProps extends HTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: "asc" | "desc" | null;
  onSort?: () => void;
  align?: "left" | "right" | "center";
  width?: string;
}

export const Th = forwardRef<HTMLTableCellElement, ThProps>(function Th(
  { className, children, sortable, sorted, onSort, align = "left", width, ...rest },
  ref,
) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-text-subtle)] font-medium",
        sortable && "cursor-pointer select-none hover:text-[var(--color-text)]",
      )}
    >
      {children}
      {sortable && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d={sorted === "asc" ? "M3 7h6L6 3z" : sorted === "desc" ? "M3 5h6L6 9z" : "M3 4h6M3 8h6"} stroke="currentColor" strokeWidth="1.2" fill={sorted ? "currentColor" : "none"} />
        </svg>
      )}
    </span>
  );
  return (
    <th
      ref={ref}
      style={width ? { width } : undefined}
      className={cn(
        "px-4 py-2.5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      onClick={sortable ? onSort : undefined}
      {...rest}
    >
      {content}
    </th>
  );
});

interface TdProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  subdued?: boolean;
}

export const Td = forwardRef<HTMLTableCellElement, TdProps>(function Td(
  { className, align = "left", subdued, ...rest },
  ref,
) {
  return (
    <td
      ref={ref}
      className={cn(
        "px-4 py-3 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        subdued && "text-[var(--color-text-muted)]",
        className,
      )}
      {...rest}
    />
  );
});

// Sort-hook helper — returns sorted rows + a toggleSort function. Caller
// keeps the sort state if it wants to preserve across interactions.
export function useSortableRows<T>(rows: T[], initial?: { key: keyof T; dir: "asc" | "desc" }) {
  const [sortKey, setSortKey] = useState<keyof T | undefined>(initial?.key);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initial?.dir || "asc");
  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey] as unknown;
      const bv = b[sortKey] as unknown;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sortKey, sortDir]);
  const toggle = (k: keyof T) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  return { rows: sorted, sortKey, sortDir, toggle };
}

// Virtual-list — opt-in for tables with 100+ rows (Clients). Uses
// react-window v2's <List> under the hood; re-exported so pages don't
// need to know about the underlying library.
export { List as VirtualList } from "react-window";
