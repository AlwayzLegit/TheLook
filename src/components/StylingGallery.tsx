import ServiceGallery from "./ServiceGallery";

// Formal Updo + Braid hidden per owner request — the stock photos
// didn't represent the salon's actual styling work. Files left in
// public/images/services/Styling/ in case they get swapped for
// real photos and re-added later. Add the lines back to this array
// when newer ones are dropped in.
//
// Each photo links to the Styling category page so the customer can
// pick the exact styling service + book.
const HREF = "/services/styling";
const stylingImages = [
  { src: "/images/services/Styling/Blow-Out.jpg", alt: "Blowout styling", href: HREF },
  { src: "/images/services/Styling/Thermal Styling.jpg", alt: "Thermal styling", href: HREF },
  { src: "/images/services/Styling/Individual Extensions.jpg", alt: "Individual extensions", href: HREF },
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
