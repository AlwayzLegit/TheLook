import ServiceGallery from "./ServiceGallery";

const stylingImages = [
  { src: "/images/services/Styling/Blow-Out.jpg", alt: "Blowout styling" },
  { src: "/images/services/Styling/Thermal Styling.jpg", alt: "Thermal styling" },
  { src: "/images/services/Styling/Formal Updo.jpg", alt: "Formal updo hairstyle" },
  { src: "/images/services/Styling/Braid.jpg", alt: "Braided style" },
  { src: "/images/services/Styling/Individual Extensions.jpg", alt: "Individual extensions" },
];

export default function StylingGallery() {
  return (
    <ServiceGallery
      title="Styling"
      subtitle="Blowouts & Updos"
      description="From polished everyday blowouts to elevated event styling, our team creates looks that feel effortless and photograph beautifully. Whether you're heading to brunch, a wedding, or a night out, you'll leave confident and camera-ready."
      images={stylingImages}
      ctaText="Book Styling"
      ctaHref="/book"
    />
  );
}
