import Image from "next/image";

// Primary salon wordmark — transparent PNG of the owner-provided lockup
// ("THE LOOK" serif + red bar + "Hair Salon" script). Source upload was a
// 500x500 JPG with the brand's olive backdrop baked in; we strip the
// backdrop and tight-crop to the actual lockup (~454x137) so the mark
// fills its container without dead space, and the alpha channel lets it
// sit cleanly on dark Navbar chrome OR a light surface (email header,
// admin shell) without showing a colored rectangle.

interface Props {
  className?: string;
  width?: number;
  height?: number;
}

// Native pixel dimensions of the cropped PNG. Aspect ratio ~3.3:1 (much
// wider than the placeholder SVG's 2:1) — callers should pass a width
// that respects this so the lockup isn't rendered tiny.
const NATIVE_W = 454;
const NATIVE_H = 137;

export default function Logo({ className = "", width = 160, height = 56 }: Props) {
  return (
    <Image
      src="/images/logo-mark.png"
      alt="The Look Hair Salon"
      width={NATIVE_W}
      height={NATIVE_H}
      priority
      className={className}
      // Fixed display box; object-contain preserves the lockup's aspect
      // ratio inside whatever the caller asked for. Letting next/image
      // serve the native PNG and CSS-scale it keeps text edges crisp on
      // retina screens — the alternative (downscaling at build time)
      // softens the serif glyphs.
      style={{ width, height, objectFit: "contain" }}
    />
  );
}
