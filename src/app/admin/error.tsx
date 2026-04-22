"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console so ops can screenshot it + paste.
    // Also sent to the server via Next's built-in error telemetry.
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h1>
        <p className="text-gray-600 mb-4">
          An error occurred while loading this page. Try again — if it keeps
          happening, copy the details below and send them to Claude.
        </p>
        <pre className="text-left text-[11px] font-mono bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto mb-4 max-h-48 whitespace-pre-wrap">
          {error?.message || String(error)}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-rose-600 text-white px-6 py-2 rounded-md hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <a
            href="/admin"
            className="text-gray-600 hover:text-gray-900 text-sm underline"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
