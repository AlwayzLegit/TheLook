"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  durationMs?: number;
}

export default function AdminToast({
  message,
  type,
  onClose,
  durationMs = 2800,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  return (
    <div className="fixed top-5 right-5 z-[100]">
      <div
        className={`px-4 py-3 shadow-lg border text-sm font-body ${
          type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}
      >
        <div className="flex items-center gap-3">
          <span>{message}</span>
          <button
            onClick={onClose}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

