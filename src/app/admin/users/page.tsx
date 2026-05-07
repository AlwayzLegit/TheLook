"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  stylist_id: string | null;
  active: boolean;
  created_at: string;
}

interface Stylist { id: string; name: string; }

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    email: "", name: "", password: "", role: "admin", stylistId: "", active: true,
  });

  const userRole = session?.user?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
    if (status === "authenticated" && userRole !== "admin") router.push("/admin");
  }, [status, router, userRole]);

  const load = async () => {
    setLoading(true);
    const [u, s] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/stylists").then((r) => r.json()),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setStylists(Array.isArray(s) ? s : []);
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated" && userRole === "admin") load();
  }, [status, userRole]);

  const resetForm = () => {
    setForm({ email: "", name: "", password: "", role: "admin", stylistId: "", active: true });
    setEditing(null);
  };

  const handleEdit = (u: User) => {
    setEditing(u);
    setForm({ email: u.email, name: u.name, password: "", role: u.role, stylistId: u.stylist_id || "", active: u.active });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
    const method = editing ? "PATCH" : "POST";

    const body: Record<string, unknown> = {
      name: form.name, role: form.role,
      stylistId: form.role === "stylist" ? form.stylistId : null,
      active: form.active,
    };
    if (!editing) {
      body.email = form.email;
      body.password = form.password;
    } else if (form.password) {
      body.password = form.password;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (res.ok) {
      setToast({ type: "success", message: editing ? "User updated." : "User created." });
      setShowForm(false);
      resetForm();
      load();
    } else {
      const data = await res.json();
      setToast({ type: "error", message: data.error || "Failed." });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ type: "success", message: "User deleted." });
      load();
    } else {
      setToast({ type: "error", message: "Failed to delete." });
    }
  };

  if (status !== "authenticated" || userRole !== "admin") return null;

  const getStylistName = (id: string | null) => stylists.find((s) => s.id === id)?.name || "—";

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">User Management</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Manage admin and stylist accounts</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add User
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="font-heading text-xl mb-4">{editing ? "Edit User" : "Create User"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-xs font-body text-navy/40 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" required />
                </div>
              )}
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" required />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">{editing ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" required={!editing} />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Role</label>
                <select
                  value={form.role === "manager" ? "manager" : "admin"}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body bg-white"
                >
                  <option value="admin">Admin — full access including user management</option>
                  <option value="manager">Manager — everything except user management</option>
                </select>
                <p className="text-[10px] text-navy/40 mt-1">
                  Managers can edit branding, services, schedule, and everything else, but can&apos;t create or delete users.
                </p>
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
      ) : users.length === 0 ? (
        <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
          <p className="font-body font-bold text-sm text-amber-900">No database users yet</p>
          <p className="text-amber-900/80 font-body text-xs mt-1">
            Signed in via the shared <code>ADMIN_PASSWORD</code> env var. Create at least one admin
            account so every login is per-person.
          </p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-body rounded-md">
          Database auth active — the shared env-var password is disabled.
        </div>
      )}
      {users.length > 0 && (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {users.map((u) => (
            <div key={u.id} className={`px-6 py-4 flex items-center justify-between ${!u.active ? "opacity-50" : ""}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-body font-bold text-sm">{u.name}</p>
                  <Badge
                    tone={u.role === "admin" ? "accent" : u.role === "manager" ? "info" : "neutral"}
                    size="sm"
                  >
                    {u.role}
                  </Badge>
                  {!u.active && <Badge tone="neutral" size="sm">Inactive</Badge>}
                </div>
                <p className="text-navy/50 text-xs font-body">{u.email}</p>
                {u.role === "stylist" && u.stylist_id && (
                  <p className="text-navy/40 text-xs font-body mt-0.5">Linked to: {getStylistName(u.stylist_id)}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEdit(u)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(u.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal title="Delete User" message="This will permanently remove this user account."
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)} />
      )}
      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
