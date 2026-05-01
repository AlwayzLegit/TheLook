import ServiceGallery from "./ServiceGallery";
import { getHomeSectionImages } from "@/lib/homeGallery";

// Each photo links to the Treatments category page so the customer
// picks the right treatment and books from there.
const HREF = "/services/treatments";

const fallbackImages = [
  { src: "/images/services/Treatments/Keratin Straightening.jpg", alt: "Keratin treatment" },
  { src: "/images/services/Treatments/Deep Conditioning.jpg", alt: "Deep conditioning" },
  { src: "/images/services/Treatments/B3 Intensive Repair.jpg", alt: "Hair repair treatment" },
  { src: "/images/services/Treatments/Scalp Oil Treatment.jpg", alt: "Scalp treatment" },
  { src: "/images/services/Treatments/vitamin-smoothing-99-natural.jpg", alt: "Smoothing treatment" },
];

export default async function TreatmentsGallery() {
  const dbImages = await getHomeSectionImages("treatments");
  const images = dbImages.length > 0
    ? dbImages.map((row) => ({ src: row.image_url, alt: row.alt || "Treatments", href: HREF }))
    : fallbackImages.map((img) => ({ ...img, href: HREF }));

  return (
    <ServiceGallery
      title="Treatments"
      subtitle="Repair & Restore"
      description="Bring dry, stressed hair back to life with treatments tailored to your texture and goals. From smoothing keratin services to moisture-rich deep conditioning, we rebuild strength, softness, and lasting shine."
      images={images}
      ctaText="Book Treatment"
      ctaHref="/book"
      reversed={true}
    />
  );
}
