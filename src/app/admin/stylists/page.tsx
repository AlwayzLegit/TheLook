"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface Stylist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image_url: string | null;
  specialties: string;
  active: boolean;
  sort_order: number;
}

export default function StylistsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Stylist | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    image_url: "",
    specialties: "",
    active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const fetchStylists = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stylists");
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to load stylists." });
        return;
      }
      const data = await res.json();
      setStylists(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchStylists();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editing ? `/api/admin/stylists/${editing.id}` : "/api/admin/stylists";
    const method = editing ? "PATCH" : "POST";
    
    try {
      setSaving(true);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setFormData({
          name: "",
          bio: "",
          image_url: "",
          specialties: "",
          active: true,
          sort_order: 0,
        });
        setToast({ type: "success", message: editing ? "Stylist updated." : "Stylist created." });
        fetchStylists();
      } else {
        setToast({ type: "error", message: "Failed to save stylist." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (stylist: Stylist) => {
    setEditing(stylist);
    setFormData({
      name: stylist.name,
      bio: stylist.bio || "",
      image_url: stylist.image_url || "",
      specialties: stylist.specialties,
      active: stylist.active,
      sort_order: stylist.sort_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/stylists/${id}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ type: "success", message: "Stylist deleted." });
        fetchStylists();
      } else {
        setToast({ type: "error", message: "Failed to delete stylist." });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddNew = () => {
    setEditing(null);
    setFormData({
      name: "",
      bio: "",
      image_url: "",
      specialties: "",
      active: true,
      sort_order: 0,
    });
    setShowForm(true);
  };

  if (status !== "authenticated") return null;

  const activeStylists = stylists.filter(s => s.active).sort((a, b) => a.sort_order - b.sort_order);
  const inactiveStylists = stylists.filter(s => !s.active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">Stylists</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90"
        >
          + Add Stylist
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl mb-4">{editing ? "Edit Stylist" : "Add Stylist"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="e.g., Jane Smith"
                  required
                />
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
                <p className="text-xs text-navy/40 mt-1">Comma-separated list</p>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body h-24"
                  placeholder="Short bio about the stylist..."
                />
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-body text-navy/60 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  />
                  <p className="text-xs text-navy/40 mt-1">Lower numbers appear first in booking</p>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-body">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-navy/20 text-sm font-body hover:bg-navy/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90"
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Stylist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stylists List */}
      {loading ? (
        <p className="text-navy/40 font-body">Loading stylists...</p>
      ) : stylists.length === 0 ? (
        <p className="text-navy/40 font-body">No stylists found.</p>
      ) : (
        <div className="space-y-6">
          {/* Active Stylists */}
          {activeStylists.length > 0 && (
            <div className="bg-white border border-navy/10">
              <div className="px-6 py-3 bg-navy/5 border-b border-navy/10">
                <h3 className="font-heading text-lg">Active Stylists</h3>
              </div>
              <div className="divide-y divide-navy/5">
                {activeStylists.map((stylist) => (
                  <div key={stylist.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {stylist.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- Admin-uploaded URLs may not match remotePatterns */
                        <img
                          src={stylist.image_url}
                          alt={stylist.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center">
                          <span className="text-lg font-heading">{stylist.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-body font-bold text-sm">{stylist.name}</p>
                        <p className="text-navy/50 text-xs font-body">{stylist.specialties}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(stylist)}
                        className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(stylist.id)}
                        disabled={deletingId === stylist.id}
                        className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50"
                      >
                        {deletingId === stylist.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Stylists */}
          {inactiveStylists.length > 0 && (
            <div className="bg-white border border-navy/10">
              <div className="px-6 py-3 bg-gray-100 border-b border-navy/10">
                <h3 className="font-heading text-lg text-gray-600">Inactive Stylists</h3>
              </div>
              <div className="divide-y divide-navy/5">
                {inactiveStylists.map((stylist) => (
                  <div key={stylist.id} className="px-6 py-4 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-4">
                      {stylist.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- Admin-uploaded URLs may not match remotePatterns */
                        <img
                          src={stylist.image_url}
                          alt={stylist.name}
                          className="w-12 h-12 rounded-full object-cover grayscale"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-lg font-heading text-gray-500">{stylist.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-body font-bold text-sm">{stylist.name}</p>
                        <p className="text-navy/50 text-xs font-body">{stylist.specialties}</p>
                        <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5">
                          Inactive
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(stylist)}
                        className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(stylist.id)}
                        disabled={deletingId === stylist.id}
                        className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50"
                      >
                        {deletingId === stylist.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Stylist"
          message="Are you sure you want to delete this stylist? This action cannot be undone."
          onConfirm={() => {
            handleDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      {toast ? (
        <AdminToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
