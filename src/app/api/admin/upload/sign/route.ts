import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { ensurePhotosBucketPublic } from "@/lib/storage";
import { NextRequest } from "next/server";

// Hands out a short-lived signed upload URL so the browser can PUT
// the file straight to Supabase Storage, bypassing Vercel's 4.5 MB
// serverless-function body cap on the Hobby plan. Without this,
// any iPhone photo over the cap (which is most of them once the
// HEIC is converted to JPEG by the browser) was being rejected by
// Vercel before it ever reached our /api/admin/upload route, which
// surfaced to the user as a generic "Upload failed. Please try
// again." in the admin services modal.
//
// Flow:
//   client → POST /api/admin/upload/sign  (auth-gated, validates ext + size)
//          ← { signedUrl, token, path, publicUrl }
//   client → uploadToSignedUrl(path, token, file)   (direct to Supabase)
//          ← OK
//   client → onChange(publicUrl)                    (saved to formData)

const ALLOWED_EXTS = new Set([
  "jpg", "jpeg", "jfif",
  "png", "webp", "heic", "heif",
  "avif", "gif", "bmp", "tif", "tiff",
]);
// Supabase free tier defaults to 50 MB per file; we cap at 10 MB to
// keep public-site image weight reasonable. The old size cap on the
// proxy upload was the same.
const MAX_SIZE = 10 * 1024 * 1024;
const BUCKET = "photos";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Storage not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const ext = (typeof body.ext === "string" ? body.ext : "").toLowerCase().replace(/^\./, "");
  const name = (typeof body.name === "string" ? body.name : "").toString();
  const folderRaw = (typeof body.folder === "string" ? body.folder : "stylists").toLowerCase();
  const size = typeof body.size === "number" ? body.size : 0;

  if (!ALLOWED_EXTS.has(ext)) {
    return apiError(
      `Unsupported file extension "${ext}". Use JPG, PNG, WebP, HEIC, or AVIF.`,
      400,
    );
  }
  if (size > MAX_SIZE) {
    return apiError(
      `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Maximum 10 MB.`,
      400,
    );
  }

  const slug = (name || "upload")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "upload";
  const folder = ["stylists", "gallery", "before-after", "inspiration", "services", "staff", "blog"].includes(folderRaw)
    ? folderRaw
    : "stylists";
  const fileExt = ext === "heif" ? "heic" : ext === "tif" ? "tiff" : ext;
  const path = `${folder}/${slug}-${Date.now()}.${fileExt}`;

  await ensurePhotosBucketPublic();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    logError("admin/upload/sign", error);
    return apiError(
      `Couldn't create upload URL: ${error?.message || "unknown"}. Storage bucket "${BUCKET}" may need to be created in Supabase.`,
      500,
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return apiSuccess({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl: pub.publicUrl,
  });
}
