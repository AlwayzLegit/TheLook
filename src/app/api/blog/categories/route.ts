import { apiSuccess } from "@/lib/apiResponse";
import { getCategories } from "@/lib/blog/posts";

export async function GET() {
  const cats = await getCategories();
  return apiSuccess(cats);
}
