// SVG version of the salon logo with a transparent background. The PNG
// asset has a solid white background, so the previous `brightness-0 invert`
// trick rendered a black rectangle on dark surfaces. This SVG renders true
// glyphs that take their color from `currentColor`.

interface Props {
  className?: string;
  // Tailwind text color decides the wordmark color. The accent bar uses the
  // brand red regardless so the salon stays recognizable.
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 240, height = 128 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 267"
      width={width}
      height={height}
      role="img"
      aria-label="The Look Hair Salon"
      className={className}
    >
      <text
        x="250"
        y="115"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', 'Playfair Display', Georgia, serif"
        fontStyle="italic"
        fontSize="120"
        fontWeight="500"
        fill="currentColor"
      >
        The Look
      </text>
      <rect x="40" y="140" width="420" height="8" fill="#E8472B" />
      <text
        x="250"
        y="220"
        textAnchor="middle"
        fontFamily="'Inter', 'Helvetica', sans-serif"
        fontSize="48"
        letterSpacing="12"
        fontWeight="300"
        fill="currentColor"
      >
        HAIR SALON
      </text>
    </svg>
  );
}
