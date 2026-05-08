import ServiceGallery from "./ServiceGallery";
import { getServicesForHomeSection } from "@/lib/homeGallery";

const fallbackImages = [
  { src: "/images/services/Treatments/Keratin Straightening.jpg", alt: "Keratin treatment" },
  { src: "/images/services/Treatments/Deep Conditioning.jpg", alt: "Deep conditioning" },
  { src: "/images/services/Treatments/B3 Intensive Repair.jpg", alt: "Hair repair treatment" },
  { src: "/images/services/Treatments/Scalp Oil Treatment.jpg", alt: "Scalp treatment" },
  { src: "/images/services/Treatments/vitamin-smoothing-99-natural.jpg", alt: "Smoothing treatment" },
];

export default async function TreatmentsGallery() {
  const services = await getServicesForHomeSection("treatments");
  const images = services.length > 0
    ? services.map((s) => ({
        src: s.image_url,
        alt: s.name,
        caption: s.name,
        href: s.slug ? `/services/item/${s.slug}` : `/book?service=${s.id}`,
      }))
    : fallbackImages.map((img) => ({ ...img, href: "/services/treatments" }));

  return (
    <ServiceGallery
      title="Treatments"
      subtitle="Repair & Restore"
      description="Bring dry, stressed hair back to life with treatments tailored to your texture and goals. From smoothing keratin services to moisture-rich deep conditioning, we rebuild strength, softness, and lasting shine."
      images={images}
      ctaText="Book your treatment"
      ctaHref="/book"
      reversed={true}
    />
  );
}
