import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { NextRequest } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("No file provided.", 400);
  }
  const file = formData.get("file") as File | null;

  if (!file) {
    return apiError("No file provided.", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError("Invalid file type. Use JPG, PNG, or WebP.", 400);
  }

  if (file.size > MAX_SIZE) {
    return apiError("File too large. Maximum 5MB.", 400);
  }

  // Generate a unique filename
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const timestamp = Date.now();
  const slug = (formData.get("name") as string || "stylist")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const filename = `${slug}-${timestamp}.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "images", "stylists");
  const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, buffer);

  const url = `/images/stylists/${filename}`;
  return apiSuccess({ url }, 201);
}
