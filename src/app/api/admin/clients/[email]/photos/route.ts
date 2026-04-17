import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// GET: list all photos for a client
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiSuccess([]);

  const { email } = await params;
  const decoded = decodeURIComponent(email);

  const { data, error } = await supabase
    .from("client_photos")
    .select("*")
    .eq("client_email", decoded)
    .order("created_at", { ascending: false });

  if (error) {
    logError("client-photos GET", error);
    return apiError("Failed to load photos.", 500);
  }

  return apiSuccess(data || []);
}

// POST: upload a photo for a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { email } = await params;
  const decoded = decodeURIComponent(email);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("No file provided.", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided.", 400);

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return apiError("Use JPG, PNG, or WebP.", 400);
  if (file.size > 5 * 1024 * 1024) return apiError("Max 5MB.", 400);

  const caption = (formData.get("caption") as string) || null;
  const photoType = (formData.get("photoType") as string) || "result";
  const appointmentId = (formData.get("appointmentId") as string) || null;
  const serviceId = (formData.get("serviceId") as string) || null;
  const takenAt = (formData.get("takenAt") as string) || new Date().toISOString().split("T")[0];

  // Upload to Supabase Storage
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const slug = decoded.split("@")[0].replace(/[^a-z0-9]/gi, "-").slice(0, 20);
  const filename = `clients/${slug}/${Date.now()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(filename, Buffer.from(bytes), { contentType: file.type, upsert: false });

  if (uploadError) {
    logError("client-photos upload", uploadError);
    return apiError(`Upload failed: ${uploadError.message}. Storage bucket "photos" may need to be created in Supabase.`, 500);
  }

  const { data: publicUrl } = supabase.storage.from("photos").getPublicUrl(filename);

  // Save metadata to client_photos table
  const { data, error: dbError } = await supabase
    .from("client_photos")
    .insert({
      client_email: decoded,
      url: publicUrl.publicUrl,
      caption,
      photo_type: photoType,
      appointment_id: appointmentId || null,
      service_id: serviceId || null,
      taken_at: takenAt,
    })
    .select()
    .single();

  if (dbError) {
    logError("client-photos insert", dbError);
    return apiError("Photo uploaded but failed to save metadata.", 500);
  }

  return apiSuccess(data, 201);
}

// DELETE: remove a photo
export async function DELETE(
  request: NextRequest,
) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const { searchParams } = request.nextUrl;
  const photoId = searchParams.get("id");
  if (!photoId) return apiError("Photo id required.", 400);

  // Get photo URL to delete from storage
  const { data: photo } = await supabase
    .from("client_photos")
    .select("url")
    .eq("id", photoId)
    .single();

  // Delete from DB
  const { error } = await supabase.from("client_photos").delete().eq("id", photoId);
  if (error) {
    logError("client-photos delete", error);
    return apiError("Failed to delete photo.", 500);
  }

  // Try to delete from storage (non-blocking)
  if (photo?.url?.includes("supabase")) {
    const path = photo.url.split("/photos/")[1];
    if (path) supabase.storage.from("photos").remove([path]).catch(() => {});
  }

  return apiSuccess({ success: true });
}
