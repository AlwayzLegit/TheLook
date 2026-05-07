import { describe, it, expect } from "vitest";
import { isOptimizableImageHost } from "../src/lib/imageHosts";

// These cases MUST mirror next.config.ts's images.remotePatterns. If
// you broaden the allowlist there, mirror it here so the runtime check
// (callers pass `unoptimized={!isOptimizableImageHost(url)}` to
// next/image) stays in sync.
describe("isOptimizableImageHost", () => {
  it("allows our Supabase Storage public bucket", () => {
    expect(
      isOptimizableImageHost(
        "https://abc123.supabase.co/storage/v1/object/public/photos/services/foo.jpg",
      ),
    ).toBe(true);
  });

  it("allows Unsplash", () => {
    expect(isOptimizableImageHost("https://images.unsplash.com/photo-123.jpg")).toBe(true);
  });

  it("allows relative paths (served from our own host)", () => {
    expect(isOptimizableImageHost("/images/hero/salon-main.jpg")).toBe(true);
  });

  it("rejects Supabase Storage signed/private paths", () => {
    expect(
      isOptimizableImageHost(
        "https://abc123.supabase.co/storage/v1/object/sign/photos/foo.jpg?token=xyz",
      ),
    ).toBe(false);
  });

  it("rejects unrelated hosts (Yelp avatar, Instagram CDN, etc.)", () => {
    expect(isOptimizableImageHost("https://s3-media1.fl.yelpcdn.com/photo/x.jpg")).toBe(false);
    expect(isOptimizableImageHost("https://scontent.cdninstagram.com/x.jpg")).toBe(false);
  });

  it("rejects http (only https in remotePatterns)", () => {
    expect(
      isOptimizableImageHost(
        "http://abc123.supabase.co/storage/v1/object/public/photos/x.jpg",
      ),
    ).toBe(false);
  });

  it("rejects empty / nullish input safely", () => {
    expect(isOptimizableImageHost("")).toBe(false);
    expect(isOptimizableImageHost(null)).toBe(false);
    expect(isOptimizableImageHost(undefined)).toBe(false);
  });

  it("rejects malformed URLs without throwing", () => {
    expect(isOptimizableImageHost("not a url")).toBe(false);
  });
});
