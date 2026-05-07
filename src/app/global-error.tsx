"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          A serious error occurred. Please reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#c2274b",
            color: "white",
            border: 0,
            padding: "0.75rem 2rem",
            cursor: "pointer",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontSize: "0.875rem",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
