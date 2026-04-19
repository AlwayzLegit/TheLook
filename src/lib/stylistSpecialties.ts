// Legacy stylist.specialties data is inconsistent: some rows store a proper
// JSON array, some store a single string joined with commas inside an array,
// some store a raw comma-separated string. This helper accepts any of those
// shapes and returns the canonical JSON-encoded string array that the admin
// UI + /api/stylists both expect.
export function normalizeSpecialties(input: unknown): string {
  let arr: string[] = [];
  if (Array.isArray(input)) {
    arr = input as string[];
  } else if (typeof input === "string" && input.trim().length > 0) {
    const raw = input.trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed as string[];
      else arr = [raw];
    } catch {
      arr = [raw];
    }
  }
  const flat: string[] = [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    for (const piece of item.split(",")) {
      const t = piece.trim();
      if (t.length > 0) flat.push(t);
    }
  }
  const seen = new Set<string>();
  const cleaned = flat.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return JSON.stringify(cleaned);
}
