"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import ImageUpload from "@/components/admin/ImageUpload";

interface Service {
  id: string;
  category: string;
  name: string;
  price_text: string;
  price_min: number;
  duration: number;
  image_url?: string | null;
  active: boolean;
  sort_order: number;
}

const DEFAULT_CATEGORIES = [
  "Haircuts",
  "Color",
  "Styling",
  "Treatments",
  "Perms & More"
];

export default function ServicesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: "Haircuts",
    name: "",
    price_text: "",
    price_min: 0,
    duration: 30,
    image_url: "",
    active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/services");
      if (!res.ok) {
        setToast({ type: "error", message: "Failed to load services." });
        return;
      }
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchServices();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = editing ? `/api/admin/services/${editing.id}` : "/api/admin/services";
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
          category: "Haircuts",
          name: "",
          price_text: "",
          price_min: 0,
          duration: 30,
          image_url: "",
          active: true,
          sort_order: 0,
        });
        setToast({ type: "success", message: editing ? "Service updated." : "Service created." });
        fetchServices();
      } else {
        setToast({ type: "error", message: "Failed to save service." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditing(service);
    setFormData({
      category: service.category,
      name: service.name,
      price_text: service.price_text,
      price_min: service.price_min,
      duration: service.duration,
      image_url: service.image_url || "",
      active: service.active,
      sort_order: service.sort_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ type: "success", message: "Service deleted." });
        fetchServices();
      } else {
        setToast({ type: "error", message: "Failed to delete service." });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddNew = () => {
    setEditing(null);
    setFormData({
      category: "Haircuts",
      name: "",
      price_text: "",
      price_min: 0,
      duration: 30,
      image_url: "",
      active: true,
      sort_order: 0,
    });
    setShowForm(true);
  };

  const [newCategory, setNewCategory] = useState("");

  if (status !== "authenticated") return null;

  // Build categories dynamically: defaults + any custom categories from existing services
  const existingCategories = [...new Set(services.map((s) => s.category))];
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCategories])];

  // Group services by category
  const groupedServices = allCategories.map(cat => ({
    category: cat,
    items: services.filter(s => s.category === cat).sort((a, b) => a.sort_order - b.sort_order)
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">Services</h1>
        <div className="flex gap-3">
          <a href="/services" target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-xs font-body border border-navy/20 hover:bg-navy/5">
            Preview on website &rarr;
          </a>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90"
          >
            + Add Service
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl mb-4">{editing ? "Edit Service" : "Add Service"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === "__new__") return;
                    setFormData({ ...formData, category: e.target.value });
                  }}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Or type a new category"
                    className="flex-1 border border-navy/20 px-3 py-1.5 text-xs font-body"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCategory.trim()) {
                        setFormData({ ...formData, category: newCategory.trim() });
                        setNewCategory("");
                      }
                    }}
                    className="text-xs font-body text-navy border border-navy/20 px-3 py-1.5 hover:bg-navy/5"
                  >
                    Use
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Service Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="e.g., Wash + Cut + Style"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-body text-navy/60 mb-1">Price Display *</label>
                  <input
                    type="text"
                    value={formData.price_text}
                    onChange={(e) => setFormData({ ...formData, price_text: e.target.value })}
                    className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                    placeholder="e.g., $80+"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-body text-navy/60 mb-1">Min Price (cents) *</label>
                  <input
                    type="number"
                    value={formData.price_min}
                    onChange={(e) => setFormData({ ...formData, price_min: parseInt(e.target.value) || 0 })}
                    className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                    placeholder="8000"
                    required
                  />
                  <p className="text-xs text-navy/40 mt-1">
                    e.g. 8000 = $80.00, 15000 = $150.00
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Duration (minutes) *</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="60"
                  required
                />
              </div>

              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                name={formData.name || formData.category}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-body text-navy/60 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  />
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
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services List */}
      {loading ? (
        <p className="text-navy/40 font-body">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="text-navy/40 font-body">No services found.</p>
      ) : (
        <div className="space-y-6">
          {groupedServices.map(({ category, items }) => (
            <div key={category} className="bg-white border border-navy/10">
              <div className="px-6 py-3 bg-navy/5 border-b border-navy/10">
                <h3 className="font-heading text-lg">{category}</h3>
              </div>
              <div className="divide-y divide-navy/5">
                {items.map((service) => (
                  <div key={service.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-body font-bold text-sm">{service.name}</p>
                      <p className="text-navy/50 text-xs font-body">
                        {service.price_text} • {service.duration} min
                      </p>
                      {service.image_url ? (
                        <p className="text-navy/40 text-[11px] font-body mt-1 break-all">
                          {service.image_url}
                        </p>
                      ) : null}
                      {!service.active && (
                        <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(service.id)}
                        disabled={deletingId === service.id}
                        className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50"
                      >
                        {deletingId === service.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Service"
          message="Are you sure you want to delete this service? This action cannot be undone."
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
