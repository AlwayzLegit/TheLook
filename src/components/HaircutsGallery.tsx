import ServiceGallery from "./ServiceGallery";
import { getServicesForHomeSection, type HomeServicePhoto } from "@/lib/homeGallery";

// Each photo is a real service from /admin/services with an
// uploaded image_url. Click on the photo → /book with that
// service preselected (and the service name shown as a caption
// on the photo).
//
// Haircuts splits into two visual photo groups today, with
// owner-supplied marketing copy. Tagging in /admin/services drives
// the grouping:
//   - Unisex + Women's services → first section ("Signature Cuts
//     & Styling"). Owner's copy treats this as the broad / styled
//     side of the menu.
//   - Men's services → second section ("Classic Cuts & Modern
//     Fades"). Same shape (hero + grid + Book a Haircut CTA), just
//     with the men-targeted hero/copy.
// Untagged services fall into the first section so a row mid-edit
// never disappears. /book still uses the three-bucket Unisex /
// Women's / Men's split because that's an admin/booking UI where
// the labels are functional, not marketing.
//
// Fallback: when no Haircut services have a photo set, render the
// old stock photos so the section never goes blank.
const fallbackImages = [
  { src: "/images/services/Haircuts/haircut-01.jpg", alt: "Precision men's haircut" },
  { src: "/images/services/Haircuts/haircut-02.jpg", alt: "Women's layered cut" },
  { src: "/images/services/Haircuts/haircut-03.jpg", alt: "Classic scissor cut" },
  { src: "/images/services/Haircuts/haircut-04.jpg", alt: "Modern textured style" },
];

// Two homepage groups. Each lists which subcategory tags collapse
// into it (in render order). Tweak here when the owner adds a new
// subcategory tag.
const HOMEPAGE_GROUPS = [
  {
    key: "signature",
    eyebrow: "Precision & Style",
    title: "Signature Cuts & Styling",
    description:
      "From soft layers and precision trims to bold transformations and modern styling, our talented stylists create looks designed to complement your lifestyle and personal beauty. Whether you're maintaining healthy hair, trying something new, or getting ready for a special occasion, we focus on detail, movement, and effortless style in every cut. Leave feeling refreshed, confident, and beautifully you.",
    // Untagged services land here too so a row mid-edit never
    // disappears from the homepage entirely.
    subcategories: ["Unisex", "Women's", ""] as const,
  },
  {
    key: "modern",
    eyebrow: "Fresh & Modern Cuts",
    title: "Classic Cuts & Modern Fades",
    description:
      "From classic gentleman's cuts to sharp fades and modern textured styles, our experienced barbers and stylists deliver clean, customized looks with precision. Whether you prefer a polished professional cut or a fresh trend-forward style, we tailor every service to fit your personality and routine. Fast, consistent, and confidence-boosting — with walk-ins always welcome.",
    subcategories: ["Men's"] as const,
  },
] as const;

function toGalleryImages(services: HomeServicePhoto[]) {
  return services.map((s) => ({
    src: s.image_url,
    alt: s.name,
    caption: s.name,
    // Land on the service detail page so the customer can read
    // about it (description, products used, what to expect)
    // before booking. Detail page's "Book this service" button
    // forwards to /book?service=<id> which preselects via the
    // useEffect added in 52d123f. Falls back to direct booking
    // if a service somehow has no slug (legacy / null-slug rows)
    // so the photo never lands on a 404.
    href: s.slug ? `/services/item/${s.slug}` : `/book?service=${s.id}`,
  }));
}

export default async function HaircutsGallery() {
  const services = await getServicesForHomeSection("haircuts");

  if (services.length === 0) {
    return (
      <ServiceGallery
        title={HOMEPAGE_GROUPS[0].title}
        subtitle={HOMEPAGE_GROUPS[0].eyebrow}
        description={HOMEPAGE_GROUPS[0].description}
        images={fallbackImages.map((img) => ({ ...img, href: "/services/haircuts" }))}
        ctaText="Book a Haircut"
        ctaHref="/book"
      />
    );
  }

  // Group by subcategory tag.
  const bySub = new Map<string, HomeServicePhoto[]>();
  for (const s of services) {
    const key = s.subcategory ?? "";
    const arr = bySub.get(key) ?? [];
    arr.push(s);
    bySub.set(key, arr);
  }

  // Collapse the grouped buckets into the two homepage groups.
  const groupedSections = HOMEPAGE_GROUPS.map((group) => {
    const collected: HomeServicePhoto[] = [];
    for (const sub of group.subcategories) {
      collected.push(...(bySub.get(sub) ?? []));
    }
    return { ...group, services: collected };
  }).filter((section) => section.services.length > 0);

  // If the data ended up with no Men's tag at all, fall back to the
  // single-gallery layout — fresh installs without the subcategory
  // seed migration applied see the same simple shape that pre-dated
  // the split.
  if (groupedSections.length <= 1) {
    return (
      <ServiceGallery
        title={HOMEPAGE_GROUPS[0].title}
        subtitle={HOMEPAGE_GROUPS[0].eyebrow}
        description={HOMEPAGE_GROUPS[0].description}
        images={toGalleryImages(services)}
        ctaText="Book a Haircut"
        ctaHref="/book"
      />
    );
  }

  return (
    <>
      {groupedSections.map((section, i) => (
        <ServiceGallery
          key={section.key}
          title={section.title}
          subtitle={section.eyebrow}
          description={section.description}
          images={toGalleryImages(section.services)}
          ctaText="Book a Haircut"
          ctaHref="/book"
          // Alternate the hero/text orientation so consecutive
          // sections don't visually stack identically.
          reversed={i % 2 === 1}
        />
      ))}
    </>
  );
}
