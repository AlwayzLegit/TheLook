"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  name?: string;
}

export default function ImageUpload({ value, onChange, name }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange(data.url);
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [name, onChange]);

  // Accept common camera formats in addition to the web-native trio. The
  // server mirrors this list + falls back to the filename extension when a
  // browser reports an empty MIME, so the final decision is made server-side.
  const ALLOWED_MIMES = [
    "image/jpeg", "image/pjpeg", "image/jfif",
    "image/png", "image/webp", "image/heic", "image/heif",
    "image/avif", "image/gif", "image/bmp", "image/tiff", "image/x-tiff",
  ];
  const ALLOWED_EXTS = ["jpg", "jpeg", "jfif", "png", "webp", "heic", "heif", "avif", "gif", "bmp", "tif", "tiff"];

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const typeOk = file.type && ALLOWED_MIMES.includes(file.type);
    const extOk = ALLOWED_EXTS.includes(ext);
    if (!typeOk && !extOk) {
      setError("Use JPG, PNG, WebP, HEIC, or AVIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Max file size is 10MB.");
      return;
    }
    upload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <label className="block text-sm font-body text-navy/60 mb-1">Photo</label>

      {/* Preview */}
      {value && (
        <div className="mb-3 relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-24 h-24 rounded-full object-cover border-2 border-navy/10"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-rose bg-rose/5"
            : "border-navy/15 hover:border-navy/30 hover:bg-navy/2"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.jfif,.png,.webp,.heic,.heif,.avif,.gif,.bmp,.tif,.tiff"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            <span className="text-sm font-body text-navy/50">Uploading...</span>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mx-auto mb-2 text-navy/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-body text-navy/50">
              {value ? "Drop a new photo or click to replace" : "Drop a photo here or click to upload"}
            </p>
            <p className="text-xs font-body text-navy/30 mt-1">JPG, PNG, WebP, HEIC, or AVIF · up to 10MB</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-xs font-body mt-2">{error}</p>
      )}

      {/* Fallback URL input */}
      <details className="mt-2">
        <summary className="text-xs font-body text-navy/30 cursor-pointer hover:text-navy/50">
          Or paste an image URL
        </summary>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="w-full border border-navy/20 px-3 py-2 text-sm font-body mt-2"
        />
      </details>
    </div>
  );
}
