import ServiceGallery from "./ServiceGallery";

// Each photo links to the matching service-category page so the
// customer can pick the exact service + book. Slugs match what the
// Navbar + Footer already publish, so no risk of a broken link if
// individual service slugs ever change.
const HREF = "/services/haircuts";
const haircutImages = [
  { src: "/images/services/Haircuts/haircut-01.jpg", alt: "Precision men's haircut", href: HREF },
  { src: "/images/services/Haircuts/haircut-02.jpg", alt: "Women's layered cut", href: HREF },
  { src: "/images/services/Haircuts/haircut-03.jpg", alt: "Classic scissor cut", href: HREF },
  { src: "/images/services/Haircuts/haircut-04.jpg", alt: "Modern textured style", href: HREF },
];

export default function HaircutsGallery() {
  return (
    <ServiceGallery
      title="Haircuts"
      subtitle="Precision & Style"
      description="From classic scissor cuts to modern fades, our experienced stylists craft the perfect look for every client. Whether you're after a subtle trim or a bold new style, we listen first and cut with confidence. Walk-ins welcome!"
      images={haircutImages}
      ctaText="Book a Haircut"
      ctaHref="/book"
    />
  );
}
