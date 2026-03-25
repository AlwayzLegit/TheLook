import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Look Hair Salon | Glendale, CA",
  description:
    "Premium hair salon in Glendale, CA offering cuts, color, styling, and treatments. Book your appointment today.",
  keywords: ["hair salon", "Glendale", "CA", "haircut", "color", "styling"],
  openGraph: {
    title: "The Look Hair Salon | Glendale, CA",
    description:
      "Premium hair salon in Glendale, CA offering cuts, color, styling, and treatments.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Forum&family=Lato:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
