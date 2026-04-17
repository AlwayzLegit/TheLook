import { auth } from "@/lib/auth";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = "photos";

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
  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError("Invalid file type. Use JPG, PNG, or WebP.", 400);
  }
  if (file.size > MAX_SIZE) {
    return apiError("File too large. Maximum 5MB.", 400);
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const slug = (formData.get("name") as string || "stylist")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const path = `stylists/${slug}-${Date.now()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), { contentType: file.type, upsert: false });

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
