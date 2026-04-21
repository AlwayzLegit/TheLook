// Before/after photo pairs shown on the homepage + gallery page.
//
// To add a new pair:
//   1. Drop two images into /public/images/before-after/
//      named like `01-before.jpg` and `01-after.jpg` (JPG or WebP).
//   2. Add a new entry to the array below with the same `before` / `after`
//      paths plus an optional caption + alt text.
//   3. Commit + push — no code changes beyond this file.
//
// Empty array ⇒ the carousel renders a "coming soon" placeholder card
// instead of a broken section.

export interface BeforeAfterPair {
  before: string;
  after: string;
  caption?: string;
  alt?: string;
}

export const BEFORE_AFTER_PAIRS: BeforeAfterPair[] = [
  // Example — drop files at these paths to enable:
  // {
  //   before: "/images/before-after/01-before.jpg",
  //   after:  "/images/before-after/01-after.jpg",
  //   caption: "Balayage + gloss · Kristina",
  //   alt: "balayage before and after",
  // },
];
