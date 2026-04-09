import ServiceGallery from "./ServiceGallery";

const treatmentImages = [
  { src: "/images/services/Treatments/Keratin Straightening.jpg", alt: "Keratin treatment" },
  { src: "/images/services/Treatments/Deep Conditioning.jpg", alt: "Deep conditioning" },
  { src: "/images/services/Treatments/B3 Intensive Repair.jpg", alt: "Hair repair treatment" },
  { src: "/images/services/Treatments/Scalp Oil Treatment.jpg", alt: "Scalp treatment" },
  {
    src: "/images/services/Treatments/vitamin-smoothing-99-natural.jpg",
    alt: "Smoothing treatment",
  },
];

export default function TreatmentsGallery() {
  return (
    <ServiceGallery
      title="Treatments"
      subtitle="Repair & Restore"
      description="Bring dry, stressed hair back to life with treatments tailored to your texture and goals. From smoothing keratin services to moisture-rich deep conditioning, we rebuild strength, softness, and lasting shine."
      images={treatmentImages}
      ctaText="Book Treatment"
      ctaHref="/book"
      reversed={true}
    />
  );
}
