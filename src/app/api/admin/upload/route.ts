import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { ensurePhotosBucketPublic } from "@/lib/storage";
import { NextRequest } from "next/server";

// Accepted image types — broader than the initial JPG/PNG/WebP set because
// real-world uploads come from iPhones (HEIC/HEIF), Windows (JFIF),
// Android/Chrome screenshots (AVIF), and scanners (TIFF/BMP). Reject only
// non-image MIMEs + anything we can't identify by extension either.
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/pjpeg",          // progressive JPEG
  "image/jfif",           // Windows JPEG variant
  "image/png",
  "image/webp",
  "image/heic",           // iPhone default
  "image/heif",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/x-tiff",
]);
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};
const MAX_SIZE = 10 * 1024 * 1024; // 10MB — HEIC / TIFF run bigger than JPG
const BUCKET = "photos";

function sniffMime(file: File): string | null {
  // Some browsers report "" or "application/octet-stream" for perfectly
  // valid images — fall back to the filename extension before rejecting.
  if (file.type && ALLOWED_MIMES.has(file.type)) return file.type;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext in EXT_TO_MIME) return EXT_TO_MIME[ext];
  return null;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg" || mime === "image/pjpeg" || mime === "image/jfif") return "jpg";
  if (mime === "image/x-tiff") return "tiff";
  // image/png -> png, image/webp -> webp, image/heic -> heic, etc.
  return mime.split("/")[1] || "bin";
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Storage not configured.", 503);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("No file provided.", 400);
  }
  const file = formData.get("file") as File | null;

  if (!file) return apiError("No file provided.", 400);

  const mime = sniffMime(file);
  if (!mime) {
    return apiError(
      `Unsupported image type "${file.type || file.name}". Use JPG, PNG, WebP, HEIC, or AVIF.`,
      400,
    );
  }
  if (file.size > MAX_SIZE) {
    return apiError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 10MB.`, 400);
  }

  const ext = extFromMime(mime);
  const slug = (formData.get("name") as string || "stylist")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const path = `stylists/${slug}-${Date.now()}.${ext}`;

  await ensurePhotosBucketPublic();

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), { contentType: mime, upsert: false });

  if (uploadError) {
    logError("admin/upload", uploadError);
    return apiError(
      `Upload failed: ${uploadError.message}. Storage bucket "${BUCKET}" may need to be created in Supabase.`,
      500,
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return apiSuccess({ url: data.publicUrl }, 201);
}
