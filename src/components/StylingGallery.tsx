import ServiceGallery from "./ServiceGallery";

const stylingImages = [
  { src: "/images/services/Styling/styling-01.jpg", alt: "Blowout styling" },
  { src: "/images/services/Styling/styling-02.jpg", alt: "Updo hairstyle" },
  { src: "/images/services/Styling/styling-03.jpg", alt: "Event styling" },
  { src: "/images/services/Styling/styling-04.jpg", alt: "Braided style" },
  { src: "/images/services/Styling/styling-05.jpg", alt: "Glamorous waves" },
];

export default function StylingGallery() {
  return (
    <ServiceGallery
      title="Styling"
      subtitle="Blowouts & Updos"
      description="From everyday blowouts to special occasion updos, our stylists create looks that turn heads. Whether it's a wedding, prom, or just because — we'll have you looking your absolute best."
      images={stylingImages}
      ctaText="Book Styling"
      ctaHref="/book"
    />
  );
}
