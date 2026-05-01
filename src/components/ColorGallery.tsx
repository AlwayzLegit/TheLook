import ServiceGallery from "./ServiceGallery";
import { getHomeSectionImages } from "@/lib/homeGallery";

// Each photo links to the Color category page where the customer
// picks an exact color service (balayage / highlights / single
// process / etc.) and books from there.
const HREF = "/services/color";

// Hardcoded fallback used when home_section_images has no rows
// for "color" yet. Renders the same set the home page shipped
// with prior to /admin/branding.
const fallbackImages = [
  { src: "/images/gallery/color/color-01.jpg", alt: "Blonde balayage" },
  { src: "/images/gallery/color/color-02.jpg", alt: "Warm highlights" },
  { src: "/images/gallery/color/color-03.jpg", alt: "Dimensional color" },
  { src: "/images/gallery/color/color-04.jpg", alt: "Sun-kissed balayage" },
  { src: "/images/gallery/color/color-05.jpg", alt: "Ash blonde tones" },
  { src: "/images/gallery/color/color-06.jpg", alt: "Golden highlights" },
  { src: "/images/gallery/color/color-07.jpg", alt: "Platinum blonde" },
  { src: "/images/gallery/color/color-08.jpg", alt: "Root smudge blend" },
];

export default async function ColorGallery() {
  const dbImages = await getHomeSectionImages("color");
  const images = dbImages.length > 0
    ? dbImages.map((row) => ({ src: row.image_url, alt: row.alt || "Color", href: HREF }))
    : fallbackImages.map((img) => ({ ...img, href: HREF }));

  return (
    <ServiceGallery
      title="Color & Highlights"
      subtitle="Dimensional Color"
      description="From sun-kissed balayage to bold fashion colors, our color specialists create dimensional, head-turning results. We use premium products to ensure vibrant, long-lasting color that keeps your hair healthy and luminous."
      images={images}
      ctaText="Book Color Service"
      ctaHref="/book"
      reversed={true}
    />
  );
}
