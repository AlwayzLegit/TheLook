import ServiceGallery from "./ServiceGallery";

const haircutImages = [
  { src: "/images/services/Haircuts/haircut-01.jpg", alt: "Precision men's haircut" },
  { src: "/images/services/Haircuts/haircut-02.jpg", alt: "Women's layered cut" },
  { src: "/images/services/Haircuts/haircut-03.jpg", alt: "Classic scissor cut" },
  { src: "/images/services/Haircuts/haircut-04.jpg", alt: "Modern textured style" },
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
