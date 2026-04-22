import { ImageResponse } from "next/og";

// Branded 180x180 apple-touch-icon for iOS home-screen pinning. Same
// design language as src/app/icon.tsx (32x32 favicon) — navy tile,
// cream serif wordmark, gold underline echoing the salon divider.
// iOS rounds the corners automatically when the image is added to
// the home screen.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#282936",
          color: "#faf8f3",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontWeight: 500,
        }}
      >
        <div
          style={{
            fontSize: 96,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          TL
        </div>
        <div
          style={{
            width: 88,
            height: 4,
            marginTop: 14,
            background: "#c4a265",
          }}
        />
        <div
          style={{
            marginTop: 12,
            fontSize: 14,
            fontStyle: "normal",
            fontFamily: "Helvetica, Arial, sans-serif",
            letterSpacing: "0.18em",
            color: "#c4a265",
            textTransform: "uppercase",
          }}
        >
          Glendale
        </div>
      </div>
    ),
    size,
  );
}
