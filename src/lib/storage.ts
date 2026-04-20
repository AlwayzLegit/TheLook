import { supabase, hasSupabaseConfig } from "@/lib/supabase";

// Supabase buckets default to PRIVATE; getPublicUrl() still returns a URL but
// the browser gets 400 when it tries to render the image — this is what makes
// uploaded stylist photos appear broken on the admin and public site.
// Ensure our image bucket is public. Memoized so we don't slam the Storage
// API on every upload / admin page load.
let photosBucketEnsured = false;
export async function ensurePhotosBucketPublic() {
  if (photosBucketEnsured || !hasSupabaseConfig) return;
  // createBucket 409s if it already exists — harmless.
  await supabase.storage.createBucket("photos", { public: true }).catch(() => {});
  // updateBucket flips an existing private bucket to public.
  await supabase.storage.updateBucket("photos", { public: true }).catch(() => {});
  photosBucketEnsured = true;
}
