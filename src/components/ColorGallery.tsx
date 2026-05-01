import ServiceGallery from "./ServiceGallery";

// Each photo links to the Color category page where the customer
// picks an exact color service (balayage / highlights / single
// process / etc.) and books from there.
const HREF = "/services/color";
const colorImages = [
  { src: "/images/gallery/color/color-01.jpg", alt: "Blonde balayage", href: HREF },
  { src: "/images/gallery/color/color-02.jpg", alt: "Warm highlights", href: HREF },
  { src: "/images/gallery/color/color-03.jpg", alt: "Dimensional color", href: HREF },
  { src: "/images/gallery/color/color-04.jpg", alt: "Sun-kissed balayage", href: HREF },
  { src: "/images/gallery/color/color-05.jpg", alt: "Ash blonde tones", href: HREF },
  { src: "/images/gallery/color/color-06.jpg", alt: "Golden highlights", href: HREF },
  { src: "/images/gallery/color/color-07.jpg", alt: "Platinum blonde", href: HREF },
  { src: "/images/gallery/color/color-08.jpg", alt: "Root smudge blend", href: HREF },
];

export default function ColorGallery() {
  return (
    <ServiceGallery
      title="Color & Highlights"
      subtitle="Dimensional Color"
      description="From sun-kissed balayage to bold fashion colors, our color specialists create dimensional, head-turning results. We use premium products to ensure vibrant, long-lasting color that keeps your hair healthy and luminous."
      images={colorImages}
      ctaText="Book Color Service"
      ctaHref="/book"
      reversed={true}
    />
  );
}
