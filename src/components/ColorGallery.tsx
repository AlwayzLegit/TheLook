import ServiceGallery from "./ServiceGallery";
import { getServicesForHomeSection } from "@/lib/homeGallery";

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
  const services = await getServicesForHomeSection("color");
  const images = services.length > 0
    ? services.map((s) => ({
        src: s.image_url,
        alt: s.name,
        caption: s.name,
        href: s.slug ? `/services/item/${s.slug}` : `/book?service=${s.id}`,
      }))
    : fallbackImages.map((img) => ({ ...img, href: "/services/color" }));

  return (
    <ServiceGallery
      title="Color & Highlights"
      subtitle="Dimensional Color"
      description="From sun-kissed balayage to bold fashion colors, our color specialists create dimensional, head-turning results. We use premium products to ensure vibrant, long-lasting color that keeps your hair healthy and luminous."
      images={images}
      ctaText="Book your color"
      ctaHref="/book"
      reversed={true}
    />
  );
}
