"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminToast from "@/components/admin/AdminToast";
import ImageUpload from "@/components/admin/ImageUpload";

interface Stylist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image_url: string | null;
  specialties: string;
  active: boolean;
}

interface Service {
  id: string;
  category: string;
  name: string;
  active: boolean;
}

export default function MyProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session?.user as any)?.role;

  const [profile, setProfile] = useState<Stylist | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [assignedServiceIds, setAssignedServiceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formData, setFormData] = useState({ name: "", bio: "", image_url: "", specialties: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "stylist") {
      router.push("/admin");
      return;
    }

    (async () => {
      try {
        const [profileRes, servicesRes, mineRes] = await Promise.all([
          fetch("/api/admin/my-profile"),
          fetch("/api/admin/services"),
          fetch("/api/admin/my-profile/services"),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
          setFormData({
            name: data.name || "",
            bio: data.bio || "",
            image_url: data.image_url || "",
            specialties: data.specialties || "",
          });
        }
        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(Array.isArray(data) ? data : []);
        }
        if (mineRes.ok) {
          const ids = await mineRes.json();
          setAssignedServiceIds(new Set(Array.isArray(ids) ? ids : []));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [status, role, router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/my-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setToast({ type: "success", message: "Profile updated." });
      } else {
        setToast({ type: "error", message: "Failed to update profile." });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleService = (id: string) => {
    setAssignedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllServices = () => setAssignedServiceIds(new Set(services.filter((s) => s.active).map((s) => s.id)));
  const clearAllServices = () => setAssignedServiceIds(new Set());

  const saveServices = async () => {
    setSavingServices(true);
    try {
      const res = await fetch("/api/admin/my-profile/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: [...assignedServiceIds] }),
      });
      if (res.ok) {
        setToast({ type: "success", message: `Services updated (${assignedServiceIds.size} assigned).` });
      } else {
        setToast({ type: "error", message: "Failed to update services." });
      }
    } finally {
      setSavingServices(false);
    }
  };

  if (status !== "authenticated") return null;
  if (role !== "stylist") return null;

  const servicesByCategory: Record<string, Service[]> = {};
  for (const s of services.filter((s) => s.active)) {
    if (!servicesByCategory[s.category]) servicesByCategory[s.category] = [];
    servicesByCategory[s.category].push(s);
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">My Profile</h1>
        {profile?.slug && (
          <Link
            href={`/stylists/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-body border border-navy/20 hover:bg-navy/5"
          >
            Preview on website &rarr;
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-navy/40 font-body">Loading your profile...</p>
      ) : !profile ? (
        <div className="bg-white border border-navy/10 p-6">
          <p className="text-navy/60 font-body">
            No stylist profile is linked to your account. Please ask an admin to link your user to a stylist record.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profile details */}
          <section className="bg-white border border-navy/10 p-6">
            <h2 className="font-heading text-xl mb-4">Profile Details</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  required
                />
                <p className="text-xs text-navy/40 mt-1">
                  Changing your name will also update your profile URL (slug).
                </p>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Specialties *</label>
                <input
                  type="text"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="e.g., Coloring, Cutting, Barber Fades"
                  required
                />
                <p className="text-xs text-navy/40 mt-1">Comma-separated list shown on your public profile.</p>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body h-28"
                  placeholder="A short bio — your background, style, what clients love about you..."
                />
              </div>

              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                name={formData.name}
              />

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90 disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          {/* Services offered */}
          <section className="bg-white border border-navy/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl">Services I Offer</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllServices}
                  className="text-xs font-body text-navy/50 hover:text-navy underline"
                >
                  Select all
                </button>
                <button
                  onClick={clearAllServices}
                  className="text-xs font-body text-navy/50 hover:text-navy underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="text-xs text-navy/50 font-body mb-4">
              Clients booking these services will be able to choose you as their stylist.
            </p>

            {Object.keys(servicesByCategory).length === 0 ? (
              <p className="text-navy/40 font-body text-sm">No services available yet.</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(servicesByCategory).map(([category, catServices]) => (
                  <div key={category}>
                    <p className="text-xs font-body font-bold text-navy/60 mb-2">{category}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {catServices.map((service) => (
                        <label
                          key={service.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-cream/40 px-2 py-1.5 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={assignedServiceIds.has(service.id)}
                            onChange={() => toggleService(service.id)}
                            className="w-4 h-4 accent-rose"
                          />
                          <span className="text-sm font-body">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-navy/10">
              <p className="text-xs font-body text-navy/40">
                {assignedServiceIds.size} of {services.filter((s) => s.active).length} services selected
              </p>
              <button
                onClick={saveServices}
                disabled={savingServices}
                className="px-6 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90 disabled:opacity-60"
              >
                {savingServices ? "Saving..." : "Save Services"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
