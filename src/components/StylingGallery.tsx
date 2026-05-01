import ServiceGallery from "./ServiceGallery";
import { getHomeSectionImages } from "@/lib/homeGallery";

// Each photo links to the Styling category page so the customer can
// pick the exact styling service + book.
const HREF = "/services/styling";

// Hardcoded fallback for fresh installs / before the owner adds
// home_section_images rows. Formal Updo + Braid were intentionally
// removed earlier; if either gets a real photo, the owner adds it
// via /admin/branding rather than re-editing this file.
const fallbackImages = [
  { src: "/images/services/Styling/Blow-Out.jpg", alt: "Blowout styling" },
  { src: "/images/services/Styling/Thermal Styling.jpg", alt: "Thermal styling" },
  { src: "/images/services/Styling/Individual Extensions.jpg", alt: "Individual extensions" },
];

export default async function StylingGallery() {
  const dbImages = await getHomeSectionImages("styling");
  const images = dbImages.length > 0
    ? dbImages.map((row) => ({ src: row.image_url, alt: row.alt || "Styling", href: HREF }))
    : fallbackImages.map((img) => ({ ...img, href: HREF }));

  return (
    <ServiceGallery
      title="Styling"
      subtitle="Blowouts & Updos"
      description="From polished everyday blowouts to elevated event styling, our team creates looks that feel effortless and photograph beautifully. Whether you're heading to brunch, a wedding, or a night out, you'll leave confident and camera-ready."
      images={images}
      ctaText="Book Styling"
      ctaHref="/book"
    />
  );
}
