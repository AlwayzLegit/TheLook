"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Stylist self-service profile editing is disabled. Admins manage every
// stylist from /admin/stylists. This stub stays in place so any old
// bookmarks redirect instead of 404'ing. Restore the full editor when
// stylist accounts come back.
export default function MyProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/stylists");
  }, [router]);
  return null;
}
