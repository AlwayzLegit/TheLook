import ServiceGallery from "./ServiceGallery";
import { getServicesForHomeSection } from "@/lib/homeGallery";

const fallbackImages = [
  { src: "/images/services/Styling/Blow-Out.jpg", alt: "Blowout styling" },
  { src: "/images/services/Styling/Thermal Styling.jpg", alt: "Thermal styling" },
  { src: "/images/services/Styling/Individual Extensions.jpg", alt: "Individual extensions" },
];

export default async function StylingGallery() {
  const services = await getServicesForHomeSection("styling");
  const images = services.length > 0
    ? services.map((s) => ({
        src: s.image_url,
        alt: s.name,
        caption: s.name,
        href: s.slug ? `/services/item/${s.slug}` : `/book?service=${s.id}`,
      }))
    : fallbackImages.map((img) => ({ ...img, href: "/services/styling" }));

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
