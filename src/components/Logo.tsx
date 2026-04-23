import Image from "next/image";

// Primary salon wordmark. The asset at /images/logo-mark.jpg is a square
// 500x500 lockup ("THE LOOK" in serif + red accent bar + "Hair Salon" in
// script) on the salon's olive/charcoal brand backdrop.
//
// The source is a flattened JPG (no transparency). It blends well on the
// Navbar's dark chrome but is a visible square on light surfaces. If we
// ever need to drop the lockup onto a light hero or an email header,
// swap in a PNG with a transparent background and the existing width /
// height props will keep sizing consistent.

interface Props {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 120, height = 64 }: Props) {
  return (
    <Image
      src="/images/logo-mark.jpg"
      alt="The Look Hair Salon"
      width={width}
      height={height}
      priority
      className={className}
      // Source is 500x500 but the Navbar crops to roughly 2:1. object-contain
      // preserves aspect so the wordmark never gets stretched or cut off
      // regardless of what width/height the caller passes.
      style={{ objectFit: "contain", maxWidth: width, maxHeight: height, width: "auto", height: "auto" }}
    />
  );
}
