import ServiceGallery from "./ServiceGallery";
import { getServicesForHomeSection, type HomeServicePhoto } from "@/lib/homeGallery";

// Each photo is a real service from /admin/services with an
// uploaded image_url. Click on the photo → /book with that
// service preselected (and the service name shown as a caption
// on the photo).
//
// Haircuts is the only home section with a subcategory split
// today: services are tagged Women's / Men's in /admin/services
// and we render one ServiceGallery sub-section per group, each
// with its own hero photo + tile grid. Services without a
// subcategory fall back into a single combined gallery (the same
// shape every other category renders) so a fresh install or a
// salon that doesn't want to split keeps the simple layout.
//
// Fallback: when no Haircut services have a photo set, render
// the old stock photos so the section never goes blank.
const fallbackImages = [
  { src: "/images/services/Haircuts/haircut-01.jpg", alt: "Precision men's haircut" },
  { src: "/images/services/Haircuts/haircut-02.jpg", alt: "Women's layered cut" },
  { src: "/images/services/Haircuts/haircut-03.jpg", alt: "Classic scissor cut" },
  { src: "/images/services/Haircuts/haircut-04.jpg", alt: "Modern textured style" },
];

// Render order on the homepage. Unisex leads because its services
// fit any client and act as a broad-appeal anchor; gendered groups
// follow. Owner can re-classify in /admin/services to change which
// services land where.
const SUBCATEGORY_ORDER = ["Unisex", "Women's", "Men's"] as const;

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
        title="Haircuts"
        subtitle="Precision & Style"
        description="From classic scissor cuts to modern fades, our experienced stylists craft the perfect look for every client. Whether you're after a subtle trim or a bold new style, we listen first and cut with confidence. Walk-ins welcome!"
        images={fallbackImages.map((img) => ({ ...img, href: "/services/haircuts" }))}
        ctaText="Book a Haircut"
        ctaHref="/book"
      />
    );
  }

  // Group by subcategory. Anything null bucket-falls into "Other"
  // so a service the owner forgot to tag still renders.
  const bySub = new Map<string, HomeServicePhoto[]>();
  for (const s of services) {
    const key = s.subcategory ?? "";
    const arr = bySub.get(key) ?? [];
    arr.push(s);
    bySub.set(key, arr);
  }

  // If the owner hasn't tagged ANY haircut with a subcategory, fall
  // through to the single-gallery layout. Same path renders today, so
  // existing salons that don't want a split see no change.
  const hasAnySubcategory = SUBCATEGORY_ORDER.some((sub) => (bySub.get(sub)?.length ?? 0) > 0);
  if (!hasAnySubcategory) {
    return (
      <ServiceGallery
        title="Haircuts"
        subtitle="Precision & Style"
        description="From classic scissor cuts to modern fades, our experienced stylists craft the perfect look for every client. Whether you're after a subtle trim or a bold new style, we listen first and cut with confidence. Walk-ins welcome!"
        images={toGalleryImages(services)}
        ctaText="Book a Haircut"
        ctaHref="/book"
      />
    );
  }

  // Render Women's first, then Men's, then any Other (untagged)
  // services last so nothing disappears if a row is mid-edit.
  const orderedSubs: string[] = [
    ...SUBCATEGORY_ORDER.filter((sub) => (bySub.get(sub)?.length ?? 0) > 0),
    ...(bySub.get("")?.length ? [""] : []),
  ];

  return (
    <>
      {orderedSubs.map((sub, i) => {
        const subServices = bySub.get(sub) ?? [];
        const isFirst = i === 0;
        // "Unisex Haircuts" reads awkwardly; just "Haircuts" works
        // when Unisex leads. Anything else gets the qualifier.
        const subTitle =
          sub === "Unisex"
            ? "Haircuts"
            : sub === ""
              ? "More Haircuts"
              : `${sub} Haircuts`;
        return (
          <ServiceGallery
            key={sub || "other"}
            title={subTitle}
            // Only the first sub-section gets the prominent
            // "Precision & Style" eyebrow — repeating it on every
            // sub-section visually shouts. Subsequent sub-sections
            // use their gender label (or "Haircuts" for Unisex)
            // as the eyebrow instead, which doubles as a quiet
            // visual divider.
            subtitle={isFirst ? "Precision & Style" : sub || "Haircuts"}
            // Lead description is part of the Haircuts section as a
            // whole; only show it on the first sub-section so we
            // don't duplicate copy.
            description={
              isFirst
                ? "From classic scissor cuts to modern fades, our experienced stylists craft the perfect look for every client. Whether you're after a subtle trim or a bold new style, we listen first and cut with confidence. Walk-ins welcome!"
                : undefined
            }
            images={toGalleryImages(subServices)}
            ctaText={isFirst ? "Book a Haircut" : undefined}
            ctaHref={isFirst ? "/book" : undefined}
            // Alternate the hero/text orientation so consecutive
            // sub-sections don't visually stack identically.
            reversed={i % 2 === 1}
          />
        );
      })}
    </>
  );
}
