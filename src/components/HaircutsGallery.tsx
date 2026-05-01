import ServiceGallery from "./ServiceGallery";
import { getServicesForHomeSection } from "@/lib/homeGallery";

// Each photo is a real service from /admin/services with an
// uploaded image_url. Click on the photo → /book with that
// service preselected (and the service name shown as a caption
// on the photo).
//
// Fallback: when no Haircut services have a photo set, render
// the old stock photos so the section never goes blank.
const fallbackImages = [
  { src: "/images/services/Haircuts/haircut-01.jpg", alt: "Precision men's haircut" },
  { src: "/images/services/Haircuts/haircut-02.jpg", alt: "Women's layered cut" },
  { src: "/images/services/Haircuts/haircut-03.jpg", alt: "Classic scissor cut" },
  { src: "/images/services/Haircuts/haircut-04.jpg", alt: "Modern textured style" },
];

export default async function HaircutsGallery() {
  const services = await getServicesForHomeSection("haircuts");
  const images = services.length > 0
    ? services.map((s) => ({
        src: s.image_url,
        alt: s.name,
        caption: s.name,
        href: `/book?service=${s.id}`,
      }))
    : fallbackImages.map((img) => ({ ...img, href: "/services/haircuts" }));

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
