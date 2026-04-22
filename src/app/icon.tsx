import { ImageResponse } from "next/og";

// Branded 32x32 favicon generated at build time. Renders a navy tile
// with the salon's serif wordmark "TL" in cream, matching the Logo
// component's editorial register. No binary asset — Next.js rasterises
// this React tree to PNG on demand and the framework wires it into
// <link rel="icon"> automatically.
//
// Replace src/app/favicon.ico with whatever the salon hands us later
// for full ICO support; until then this PNG icon serves modern
// browsers (everything since IE11).

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#282936",
          color: "#faf8f3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: "-0.02em",
          borderRadius: 6,
          // Subtle gold underline echoing the salon's signature divider.
          borderBottom: "2px solid #c4a265",
        }}
      >
        TL
      </div>
    ),
    size,
  );
}
