"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, Eyebrow } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  title: string | null;
  bio: string | null;
  image_url: string | null;
  slug: string | null;
  active_for_public: boolean;
  sort_order: number;
}

export default function AdminProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((data) => setProfile(data || null))
      .finally(() => setLoading(false));
  }, [status]);

  if (status !== "authenticated") return null;

  const save = async (patch: Partial<Profile>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        toast.success("Profile saved.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "staff");
      form.append("name", profile?.name || "profile");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || "Upload failed.");
        return;
      }
      await save({ image_url: data.url });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[820px] mx-auto">
      <div className="mb-6">
        <Eyebrow>My profile</Eyebrow>
        <h1 className="mt-1 text-[2rem] font-heading text-[var(--color-text)] leading-none">Your profile</h1>
        <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-2">
          Edit your name, photo, bio, and whether your profile shows publicly on the <code>/team</code> page.
        </p>
      </div>

      {loading || !profile ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 bg-[var(--color-cream-200)] overflow-hidden rounded-full shrink-0">
              {profile.image_url ? (
                <Image
                  src={profile.image_url}
                  alt={profile.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized={profile.image_url.startsWith("http")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-heading text-[var(--color-text-muted)]">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-[var(--color-text-muted)] mb-2">
                Signed in as <span className="font-medium text-[var(--color-text)]">{profile.email}</span> ·
                {" "}<span className="uppercase tracking-wider text-[11px]">{profile.role}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  loading={uploading}
                >
                  {profile.image_url ? "Change photo" : "Upload photo"}
                </Button>
                {profile.image_url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => save({ image_url: "" })}
                  >
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Display name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              onBlur={() => save({ name: profile.name })}
            />
            <Input
              label="Title"
              value={profile.title ?? ""}
              placeholder={profile.role === "manager" ? "Salon Manager" : "Owner"}
              onChange={(e) => setProfile({ ...profile, title: e.target.value })}
              onBlur={() => save({ title: profile.title ?? "" })}
              hint="Shown under your name on the /team page."
            />
          </div>

          <Textarea
            label="Bio"
            rows={4}
            value={profile.bio ?? ""}
            placeholder="A short intro the public will see on /team. 1–3 sentences is perfect."
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            onBlur={() => save({ bio: profile.bio ?? "" })}
          />

          <Input
            label="Public URL slug"
            value={profile.slug ?? ""}
            placeholder="leave blank to auto-generate from your name"
            onChange={(e) => setProfile({ ...profile, slug: e.target.value })}
            onBlur={() => save({ slug: profile.slug ?? "" })}
            hint={profile.slug ? `/team/${profile.slug}` : "auto-generated from name when you go public"}
          />

          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-5">
            <div>
              <p className="font-medium text-[0.875rem] text-[var(--color-text)]">Show on public /team page</p>
              <p className="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                When on, your photo, name, title, and bio appear in a Management section above the stylist grid.
                When off (default), you stay hidden.
              </p>
            </div>
            <Checkbox
              checked={profile.active_for_public}
              onCheckedChange={(v) => {
                const next = v === true;
                setProfile({ ...profile, active_for_public: next });
                save({ active_for_public: next });
              }}
              label={profile.active_for_public ? "Live" : "Hidden"}
            />
          </div>

          {saving ? (
            <p className="text-[0.75rem] text-[var(--color-text-subtle)]">Saving…</p>
          ) : null}
        </Card>
      )}
    </div>
  );
}
