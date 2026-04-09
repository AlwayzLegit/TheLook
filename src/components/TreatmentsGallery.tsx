import ServiceGallery from "./ServiceGallery";

const treatmentImages = [
  { src: "/images/services/Treatments/treatment-01.jpg", alt: "Keratin treatment" },
  { src: "/images/services/Treatments/treatment-02.jpg", alt: "Deep conditioning" },
  { src: "/images/services/Treatments/treatment-03.jpg", alt: "Hair repair treatment" },
  { src: "/images/services/Treatments/treatment-04.jpg", alt: "Scalp treatment" },
  { src: "/images/services/Treatments/treatment-05.jpg", alt: "Smoothing treatment" },
];

export default function TreatmentsGallery() {
  return (
    <ServiceGallery
      title="Treatments"
      subtitle="Repair & Restore"
      description="Revive damaged hair with our intensive treatments. From keratin straightening to deep conditioning, we restore health, shine, and manageability to your locks."
      images={treatmentImages}
      ctaText="Book Treatment"
      ctaHref="/book"
      reversed={true}
    />
  );
}
