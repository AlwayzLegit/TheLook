"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import ImageUpload from "@/components/admin/ImageUpload";
import ServiceVariantsEditor from "@/components/admin/ServiceVariantsEditor";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDuration } from "@/lib/format";
import Image from "next/image";

interface Service {
  id: string;
  category: string;
  subcategory?: string | null;
  name: string;
  slug?: string | null;
  price_text: string;
  price_min: number;
  duration: number;
  image_url?: string | null;
  description?: string | null;
  products_used?: string | null;
  what_to_expect?: string | null;
  recommended_frequency?: string | null;
  pair_with?: string | null;
  active: boolean;
  sort_order: number;
}

const DEFAULT_CATEGORIES = [
  "Haircuts",
  "Color",
  "Styling",
  "Treatments",
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
    subcategory: "",
    name: "",
    slug: "",
    price_text: "",
    price_min: 0,
    duration: 30,
    image_url: "",
    description: "",
    products_used: "",
    what_to_expect: "",
    recommended_frequency: "",
    pair_with: "",
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

    // Explicit JS-side validation. We intentionally set noValidate on
    // the <form> below: HTML5's required-attribute path silently blocks
    // submit when a required field is empty AND scrolled out of view in
    // an overflow-y-auto modal — the user sees the Save button "do
    // nothing" with no toast, no spinner, no console error. Validating
    // here gives us a concrete toast naming the missing field and
    // guarantees handleSubmit (and the saving spinner) always runs.
    const trimmedName = formData.name.trim();
    const trimmedPriceText = (formData.price_text || "").trim();
    if (!trimmedName) {
      setToast({ type: "error", message: "Service name is required." });
      return;
    }
    if (!trimmedPriceText) {
      setToast({ type: "error", message: "Price display is required (e.g. \"$80+\")." });
      return;
    }
    if (!Number.isFinite(formData.price_min) || formData.price_min < 0) {
      setToast({ type: "error", message: "Min price (cents) must be a non-negative number." });
      return;
    }
    if (!Number.isFinite(formData.duration) || formData.duration < 1) {
      setToast({ type: "error", message: "Duration must be at least 1 minute." });
      return;
    }

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
          subcategory: "",
          name: "",
          slug: "",
          price_text: "",
          price_min: 0,
          duration: 30,
          image_url: "",
          description: "",
          products_used: "",
          what_to_expect: "",
          recommended_frequency: "",
          pair_with: "",
          active: true,
          sort_order: 0,
        });
        setToast({ type: "success", message: editing ? "Service updated." : "Service created." });
        fetchServices();
      } else {
        // Surface the server's actual message in both the toast + console so
        // the owner can act on "Invalid image_url: too long" instead of a
        // bare "SAVE not working". Keep the form open so edits aren't lost.
        const raw = await res.text();
        let parsed: { error?: string } = {};
        try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
        const msg = parsed.error || raw || `Failed to save service (HTTP ${res.status}).`;
        console.error("admin/services save failed:", res.status, msg);
        setToast({ type: "error", message: msg });
      }
    } catch (err) {
      console.error("admin/services save network error:", err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditing(service);
    // Coerce every field into a defined non-null value before it lands
    // in formData. Older / migrated service rows can have nulls in
    // columns the form treats as required (price_text, price_min,
    // duration). Letting null reach a controlled <input> produces
    // value="" and would make Save look broken via stale state +
    // browser quirks even though noValidate now prevents the silent
    // block.
    setFormData({
      category: service.category || "Haircuts",
      subcategory: service.subcategory || "",
      name: service.name || "",
      slug: service.slug || "",
      price_text: service.price_text || "",
      price_min: Number.isFinite(service.price_min) ? service.price_min : 0,
      duration: Number.isFinite(service.duration) && service.duration > 0 ? service.duration : 30,
      image_url: service.image_url || "",
      description: service.description || "",
      products_used: service.products_used || "",
      what_to_expect: service.what_to_expect || "",
      recommended_frequency: service.recommended_frequency || "",
      pair_with: service.pair_with || "",
      active: service.active ?? true,
      sort_order: Number.isFinite(service.sort_order) ? service.sort_order : 0,
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

  // Reorder handler — swaps a service with its neighbour within
  // the same category (per-category list passed in by the caller),
  // updates local state optimistically, and PATCHes the new order
  // server-side via /api/admin/services/reorder. Reverts via a
  // refetch if the server rejects.
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const handleMove = async (
    categoryItems: Service[],
    index: number,
    direction: "up" | "down",
  ) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categoryItems.length) return;

    const reordered = [...categoryItems];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    const newOrders = new Map(reordered.map((s, i) => [s.id, i]));
    setServices((prev) =>
      prev.map((s) =>
        newOrders.has(s.id) ? { ...s, sort_order: newOrders.get(s.id) ?? s.sort_order } : s,
      ),
    );

    setReorderingId(categoryItems[index].id);
    try {
      const res = await fetch("/api/admin/services/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ type: "error", message: data.error || "Reorder failed. Refreshing." });
        fetchServices();
      }
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Reorder failed. Refreshing.",
      });
      fetchServices();
    } finally {
      setReorderingId(null);
    }
  };

  const handleAddNew = () => {
    setEditing(null);
    setFormData({
      category: "Haircuts",
      subcategory: "",
      name: "",
      slug: "",
      price_text: "",
      price_min: 0,
      duration: 30,
      image_url: "",
      description: "",
      products_used: "",
      what_to_expect: "",
      recommended_frequency: "",
      pair_with: "",
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
    <div className="p-4 sm:p-8">
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
            
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

              {/* Subcategory: only meaningful for Haircuts today
                  (splits the homepage gallery into Women's / Men's
                  sub-sections). Hidden for other categories so the
                  form doesn't push owners to set values that no
                  template renders against. */}
              {formData.category === "Haircuts" && (
                <div>
                  <label className="block text-sm font-body text-navy/60 mb-1">Subcategory</label>
                  <select
                    value={formData.subcategory || ""}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  >
                    <option value="">— None (renders un-split) —</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Women's">Women&apos;s</option>
                    <option value="Men's">Men&apos;s</option>
                  </select>
                  <p className="text-xs font-body text-navy/50 mt-1">
                    Splits the homepage Haircuts gallery into Unisex, Women&apos;s and Men&apos;s sub-sections, each with its own hero photo. Unisex renders first so universal services lead.
                  </p>
                </div>
              )}

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

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">URL slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="leave blank to auto-generate from name"
                />
                <p className="text-xs text-navy/40 mt-1">
                  Used in the detail-page URL: /services/item/{formData.slug || "auto"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="What the service includes, what to expect, how to prepare, etc."
                />
                <p className="text-xs text-navy/40 mt-1">
                  Shown on the service detail page. Leave blank to use the default copy.
                </p>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Products used</label>
                <textarea
                  rows={2}
                  value={formData.products_used}
                  onChange={(e) => setFormData({ ...formData, products_used: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="e.g. Olaplex No. 3, Redken Chromatics, Kérastase Nutritive"
                />
              </div>

              {/* Per-service framing — three short blurbs rendered in
                  the three-column band on /services/item/<slug>. Leave
                  blank to fall back to the per-category default copy. */}
              <div className="border-t border-navy/10 pt-4">
                <p className="text-xs uppercase tracking-[0.15em] text-navy/45 font-body mb-1">
                  Service detail page — extra copy
                </p>
                <p className="text-xs text-navy/40 mb-3">
                  Shown on the public detail page in three columns. Leave any field blank to use
                  the default category copy.
                </p>
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">What to expect</label>
                <textarea
                  rows={3}
                  value={formData.what_to_expect}
                  onChange={(e) => setFormData({ ...formData, what_to_expect: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="Walk the client through how this specific service runs — consultation, chair time, finish."
                />
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Recommended frequency</label>
                <textarea
                  rows={2}
                  value={formData.recommended_frequency}
                  onChange={(e) => setFormData({ ...formData, recommended_frequency: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="e.g. Every 4–6 weeks for line-up cuts; every 8–10 weeks for grown-out styles."
                />
              </div>

              <div>
                <label className="block text-sm font-body text-navy/60 mb-1">Pair with</label>
                <textarea
                  rows={2}
                  value={formData.pair_with}
                  onChange={(e) => setFormData({ ...formData, pair_with: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  placeholder="Suggest add-ons or follow-up services that complement this one."
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

            {editing && (
              <ServiceVariantsEditor
                serviceId={editing.id}
                onToast={(type, message) => setToast({ type, message })}
              />
            )}
          </div>
        </div>
      )}

      {/* Services List */}
      {loading ? (
        <p className="text-navy/40 font-body">Loading services...</p>
      ) : services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Add your first service to let clients book online."
        />
      ) : (
        <div className="space-y-6">
          {groupedServices.map(({ category, items }) => (
            <div key={category} className="bg-white border border-navy/10">
              <div className="px-6 py-3 bg-navy/5 border-b border-navy/10">
                <h3 className="font-heading text-lg">{category}</h3>
              </div>
              <div className="divide-y divide-navy/5">
                {items.map((service, idx) => (
                  <div key={service.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Up / down arrow column. Disabled at the
                          boundaries of the category list. Owner asked
                          for a way to rearrange services without
                          opening each row to edit sort_order, so the
                          arrows call /api/admin/services/reorder
                          which bulk-updates sort_order to match the
                          new index. */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMove(items, idx, "up")}
                          disabled={idx === 0 || reorderingId === service.id}
                          aria-label={`Move ${service.name} up`}
                          className="text-navy/40 hover:text-navy hover:bg-navy/5 px-1.5 py-0.5 text-xs leading-none disabled:opacity-25 disabled:hover:bg-transparent"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(items, idx, "down")}
                          disabled={idx === items.length - 1 || reorderingId === service.id}
                          aria-label={`Move ${service.name} down`}
                          className="text-navy/40 hover:text-navy hover:bg-navy/5 px-1.5 py-0.5 text-xs leading-none disabled:opacity-25 disabled:hover:bg-transparent"
                        >
                          ▼
                        </button>
                      </div>
                      {service.image_url ? (
                        <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-cream/40 relative">
                          <Image src={service.image_url} alt={service.name} fill sizes="48px" className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded shrink-0 bg-cream flex items-center justify-center text-navy/30 text-xs font-body">
                          —
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-body font-bold text-sm flex items-center gap-2">
                          {service.name}
                          {!service.active && <Badge tone="neutral" size="sm">Inactive</Badge>}
                        </p>
                        <p className="text-navy/50 text-xs font-body">
                          {service.price_text} · {formatDuration(service.duration)}
                        </p>
                      </div>
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
