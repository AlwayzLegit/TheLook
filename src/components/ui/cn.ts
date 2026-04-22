// Tiny classname joiner — skip pulling in clsx for a dozen components.
// Accepts any truthy/falsy input so callers can write
// `cn(base, cond && "pl-9", error && "err")` without a narrow cast.
export function cn(...parts: Array<unknown>): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");
}
