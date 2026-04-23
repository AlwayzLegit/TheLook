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
}

// Native pixel dimensions of the cropped PNG. Aspect ratio ~3.3:1.
const NATIVE_W = 454;
const NATIVE_H = 137;

export default function Logo({ className = "" }: Props) {
  return (
    <Image
      src="/images/logo-mark.png"
      alt="The Look Hair Salon"
      width={NATIVE_W}
      height={NATIVE_H}
      priority
      // Caller controls the displayed size via className (Tailwind
      // `w-[..]` + `h-auto`, or responsive variants). Keeping the width
      // + height props at native pixels lets next/image serve a sharp
      // bitmap and CSS handles the display scale — avoids the fuzzy
      // look that shows up when you downscale a bitmap at build time.
      className={`object-contain h-auto ${className}`}
    />
  );
}
