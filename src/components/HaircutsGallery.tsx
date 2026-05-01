import ServiceGallery from "./ServiceGallery";
import { getHomeSectionImages } from "@/lib/homeGallery";

// Each photo links to the matching service-category page so the
// customer can pick the exact service + book. Slugs match what the
// Navbar + Footer already publish, so no risk of a broken link if
// individual service slugs ever change.
const HREF = "/services/haircuts";

// Hardcoded fallback used when the owner hasn't seeded
// home_section_images for this section yet. Keeps the home page
// rendering the same as before /admin/branding shipped on a fresh
// install.
const fallbackImages = [
  { src: "/images/services/Haircuts/haircut-01.jpg", alt: "Precision men's haircut" },
  { src: "/images/services/Haircuts/haircut-02.jpg", alt: "Women's layered cut" },
  { src: "/images/services/Haircuts/haircut-03.jpg", alt: "Classic scissor cut" },
  { src: "/images/services/Haircuts/haircut-04.jpg", alt: "Modern textured style" },
];

export default async function HaircutsGallery() {
  const dbImages = await getHomeSectionImages("haircuts");
  const images = dbImages.length > 0
    ? dbImages.map((row) => ({ src: row.image_url, alt: row.alt || "Haircuts", href: HREF }))
    : fallbackImages.map((img) => ({ ...img, href: HREF }));

  return (
    <ServiceGallery
      title="Haircuts"
      subtitle="Precision & Style"
      description="From classic scissor cuts to modern fades, our experienced stylists craft the perfect look for every client. Whether you're after a subtle trim or a bold new style, we listen first and cut with confidence. Walk-ins welcome!"
      images={images}
      ctaText="Book a Haircut"
      ctaHref="/book"
    />
  );
}
