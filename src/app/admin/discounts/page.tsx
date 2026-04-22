"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";

interface Discount {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  min_purchase: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

function formatValue(type: string, value: number) {
  return type === "percentage" ? `${value}%` : `$${(value / 100).toFixed(0)}`;
}

export default function DiscountsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percentage",
    value: 20,
    minPurchase: 0,
    maxUses: "",
    validFrom: "",
    validUntil: "",
    active: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/discounts");
    if (res.ok) {
      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  const resetForm = () => {
    setForm({ code: "", description: "", type: "percentage", value: 20, minPurchase: 0, maxUses: "", validFrom: "", validUntil: "", active: true });
    setEditing(null);
  };

  const handleEdit = (d: Discount) => {
    setEditing(d);
    setForm({
      code: d.code,
      description: d.description || "",
      type: d.type,
      value: d.value,
      minPurchase: d.min_purchase,
      maxUses: d.max_uses ? String(d.max_uses) : "",
      validFrom: d.valid_from || "",
      validUntil: d.valid_until || "",
      active: d.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/admin/discounts/${editing.id}` : "/api/admin/discounts";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        description: form.description,
        type: form.type,
        value: form.value,
        minPurchase: form.minPurchase,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        active: form.active,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setToast({ type: "success", message: editing ? "Discount updated." : "Discount created." });
      setShowForm(false);
      resetForm();
      load();
    } else {
      const data = await res.json();
      setToast({ type: "error", message: data.error || "Failed to save." });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/discounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ type: "success", message: "Discount deleted." });
      load();
    } else {
      setToast({ type: "error", message: "Failed to delete." });
    }
  };

  if (status !== "authenticated") return null;

  const today = new Date().toISOString().split("T")[0];
  const activeDiscounts = discounts.filter((d) => d.active && (!d.valid_until || d.valid_until >= today));
  const inactiveDiscounts = discounts.filter((d) => !d.active || (d.valid_until && d.valid_until < today));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">Discounts</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Manage coupon codes and promotions</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90">
          + New Discount
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl mb-4">{editing ? "Edit Discount" : "Create Discount"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Code *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME20" className="w-full border border-navy/20 px-3 py-2 text-sm font-body uppercase" required disabled={!!editing} />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="20% off for new clients" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Value *</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseInt(e.target.value) || 0 })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" required />
                  <p className="text-[10px] text-navy/30 mt-1">{form.type === "percentage" ? "e.g. 20 = 20% off" : "In cents: 2000 = $20 off"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Min Purchase (cents)</label>
                  <input type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: parseInt(e.target.value) || 0 })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Max Uses</label>
                  <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Valid From</label>
                  <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Valid Until</label>
                  <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm font-body">Active</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 px-4 py-2 border border-navy/20 text-sm font-body hover:bg-navy/5">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading...</p>
      ) : discounts.length === 0 ? (
        <EmptyState
          title="No discounts yet"
          description="Create your first promo code to share with clients."
        />
      ) : (
        <div className="space-y-6">
          {activeDiscounts.length > 0 && (
            <div className="bg-white border border-navy/10">
              <div className="px-6 py-3 bg-navy/5 border-b border-navy/10">
                <h3 className="font-heading text-lg">Active ({activeDiscounts.length})</h3>
              </div>
              <div className="divide-y divide-navy/5">
                {activeDiscounts.map((d) => (
                  <div key={d.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">{d.code}</span>
                        <span className="text-sm font-heading text-rose">{formatValue(d.type, d.value)} off</span>
                      </div>
                      {d.description && <p className="text-navy/50 text-xs font-body mt-1">{d.description}</p>}
                      <p className="text-navy/30 text-[10px] font-body mt-1">
                        Used {d.uses_count}{d.max_uses ? ` / ${d.max_uses}` : ""} times
                        {d.valid_until ? ` · Expires ${d.valid_until}` : ""}
                        {d.min_purchase ? ` · Min ${formatValue("fixed", d.min_purchase)}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(d)} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50">Edit</button>
                      <button onClick={() => setConfirmDeleteId(d.id)} className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inactiveDiscounts.length > 0 && (
            <div className="bg-white border border-navy/10">
              <div className="px-6 py-3 bg-gray-100 border-b border-navy/10">
                <h3 className="font-heading text-lg text-gray-600">Expired / Inactive ({inactiveDiscounts.length})</h3>
              </div>
              <div className="divide-y divide-navy/5">
                {inactiveDiscounts.map((d) => (
                  <div key={d.id} className="px-6 py-4 flex items-center justify-between opacity-60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{d.code}</span>
                        <span className="text-sm font-body text-navy/40">{formatValue(d.type, d.value)} off</span>
                      </div>
                      <p className="text-navy/30 text-[10px] font-body mt-1">
                        Used {d.uses_count} times
                        {d.valid_until && d.valid_until < today ? " · Expired" : " · Disabled"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(d)} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50">Edit</button>
                      <button onClick={() => setConfirmDeleteId(d.id)} className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal title="Delete Discount" message="Are you sure? This cannot be undone."
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)} />
      )}
      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
