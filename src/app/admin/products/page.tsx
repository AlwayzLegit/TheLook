"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sku: string | null;
  stock_qty: number;
  low_stock_threshold: number;
  cost_price: number | null;
  retail_price: number | null;
  active: boolean;
}

const CATEGORIES = ["color", "treatment", "styling", "retail", "other"];

function formatCents(c: number | null) {
  if (c === null || c === undefined) return "—";
  return `$${(c / 100).toFixed(2)}`;
}

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session?.user as any)?.role;

  const [form, setForm] = useState({
    name: "", brand: "", category: "color", sku: "",
    stockQty: 0, lowStockThreshold: 5,
    costPrice: 0, retailPrice: 0, active: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
    if (status === "authenticated" && userRole !== "admin") router.push("/admin");
  }, [status, router, userRole]);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/products");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated" && userRole === "admin") load();
  }, [status, userRole]);

  const resetForm = () => {
    setForm({ name: "", brand: "", category: "color", sku: "", stockQty: 0, lowStockThreshold: 5, costPrice: 0, retailPrice: 0, active: true });
    setEditing(null);
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, brand: p.brand || "", category: p.category || "color", sku: p.sku || "",
      stockQty: p.stock_qty, lowStockThreshold: p.low_stock_threshold,
      costPrice: p.cost_price || 0, retailPrice: p.retail_price || 0,
      active: p.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setToast({ type: "success", message: editing ? "Product updated." : "Product added." });
      setShowForm(false);
      resetForm();
      load();
    } else {
      setToast({ type: "error", message: "Failed." });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ type: "success", message: "Deleted." });
      load();
    }
  };

  const adjustStock = async (p: Product, delta: number) => {
    const newQty = Math.max(0, p.stock_qty + delta);
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockQty: newQty }),
    });
    load();
  };

  if (status !== "authenticated" || userRole !== "admin") return null;

  const lowStock = products.filter((p) => p.active && p.stock_qty <= p.low_stock_threshold);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">Inventory</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Products and stock tracking</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90">
          + Add Product
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 mb-6">
          <p className="text-sm font-body font-bold text-amber-800">⚠️ Low stock alert</p>
          <p className="text-xs font-body text-amber-700 mt-1">
            {lowStock.map((p) => p.name).join(", ")} — time to reorder
          </p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl mb-4">{editing ? "Edit Product" : "Add Product"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Brand</label>
                  <input type="text" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">SKU</label>
                <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Stock Qty</label>
                  <input type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: parseInt(e.target.value) || 0 })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Low Alert Threshold</label>
                  <input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: parseInt(e.target.value) || 0 })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Cost Price (cents)</label>
                  <input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseInt(e.target.value) || 0 })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                </div>
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Retail Price (cents)</label>
                  <input type="number" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: parseInt(e.target.value) || 0 })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
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
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add retail inventory or back-bar supplies to track stock levels."
        />
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {products.map((p) => (
            <div key={p.id} className={`px-6 py-4 flex items-center justify-between ${!p.active ? "opacity-50" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-body font-bold text-sm">{p.name}</p>
                  {p.brand && <span className="text-xs font-body text-navy/40">by {p.brand}</span>}
                  {p.category && <Badge tone="neutral" size="sm">{p.category}</Badge>}
                  {p.stock_qty <= p.low_stock_threshold && <Badge tone="warning" size="sm">Low stock</Badge>}
                </div>
                <p className="text-navy/40 text-xs font-body mt-0.5">
                  {p.sku && `SKU: ${p.sku} · `}
                  Cost: {formatCents(p.cost_price)} · Retail: {formatCents(p.retail_price)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="flex items-center gap-1 border border-navy/20">
                  <button onClick={() => adjustStock(p, -1)} className="w-8 h-8 text-sm font-body hover:bg-navy/5">−</button>
                  <span className="w-12 text-center font-heading text-sm">{p.stock_qty}</span>
                  <button onClick={() => adjustStock(p, 1)} className="w-8 h-8 text-sm font-body hover:bg-navy/5">+</button>
                </div>
                <button onClick={() => handleEdit(p)} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1 hover:bg-blue-50">Edit</button>
                <button onClick={() => setDeleteId(p.id)} className="text-xs font-body text-red-600 border border-red-200 px-3 py-1 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmModal title="Delete Product" message="This cannot be undone."
          onConfirm={() => { handleDelete(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)} />
      )}
      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
