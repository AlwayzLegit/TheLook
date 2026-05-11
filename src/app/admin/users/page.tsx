"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ALL_PERMISSIONS,
  ADMIN_PRESET,
  MANAGER_PRESET,
  PERMISSION_META,
  type Permission,
} from "@/lib/permissions";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  stylist_id: string | null;
  active: boolean;
  title: string | null;
  permissions: string[] | null;
  created_at: string;
}

interface Stylist {
  id: string;
  name: string;
}

interface FormState {
  email: string;
  name: string;
  password: string;
  title: string;
  // legacy role kept on the record for compat with the existing
  // schema check constraint — UI hides it behind an "Advanced" toggle.
  role: "admin" | "manager" | "stylist";
  stylistId: string;
  active: boolean;
  permissions: Permission[];
}

function emptyForm(): FormState {
  // New users default to the Manager preset — that's the common case
  // (most operators are not admins). Admin can flip to the Admin
  // preset or pick individual boxes.
  return {
    email: "",
    name: "",
    password: "",
    title: "",
    role: "manager",
    stylistId: "",
    active: true,
    permissions: [...MANAGER_PRESET],
  };
}

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
  const [form, setForm] = useState<FormState>(emptyForm);

  // Gate the page on manage_users. Falls back to the legacy admin
  // role for sessions that predate the permission rollout.
  const sessionPerms = session?.user?.permissions;
  const sessionRole = session?.user?.role;
  const canManageUsers =
    (Array.isArray(sessionPerms) && sessionPerms.includes("manage_users")) ||
    (!sessionPerms && sessionRole === "admin");
  const sessionEmail = session?.user?.email?.toLowerCase() ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
    if (status === "authenticated" && !canManageUsers) router.push("/admin");
  }, [status, router, canManageUsers]);

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
    if (status === "authenticated" && canManageUsers) load();
  }, [status, canManageUsers]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
  };

  const handleEdit = (u: User) => {
    setEditing(u);
    // Existing rows may have an empty permission array if they were
    // created before the migration ran but never re-saved. Fall back
    // to the role preset so the checkboxes start in a sensible state.
    const perms: Permission[] = Array.isArray(u.permissions) && u.permissions.length > 0
      ? (u.permissions.filter((p): p is Permission => (ALL_PERMISSIONS as readonly string[]).includes(p)))
      : u.role === "admin" ? [...ADMIN_PRESET]
      : u.role === "manager" ? [...MANAGER_PRESET]
      : [];
    setForm({
      email: u.email,
      name: u.name,
      password: "",
      title: u.title || "",
      role: (u.role as "admin" | "manager" | "stylist") || "manager",
      stylistId: u.stylist_id || "",
      active: u.active,
      permissions: perms,
    });
    setShowForm(true);
  };

  const togglePermission = (p: Permission) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p)
        ? f.permissions.filter((x) => x !== p)
        : [...f.permissions, p],
    }));
  };

  const applyPreset = (preset: "admin" | "manager" | "none") => {
    setForm((f) => ({
      ...f,
      permissions:
        preset === "admin"
          ? [...ADMIN_PRESET]
          : preset === "manager"
            ? [...MANAGER_PRESET]
            : [],
      role: preset === "admin" ? "admin" : preset === "manager" ? "manager" : f.role,
    }));
  };

  const editingSelf = editing && sessionEmail && editing.email.toLowerCase() === sessionEmail;
  const selfWouldLoseManageUsers =
    !!editingSelf && !form.permissions.includes("manage_users");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selfWouldLoseManageUsers) {
      setToast({
        type: "error",
        message: "You can't remove your own \"Manage users\" permission — ask another admin.",
      });
      return;
    }
    setSaving(true);
    const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
    const method = editing ? "PATCH" : "POST";

    const body: Record<string, unknown> = {
      name: form.name,
      title: form.title.trim() || null,
      role: form.role,
      permissions: form.permissions,
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
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed." });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ type: "success", message: "User deleted." });
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error || "Failed to delete." });
    }
  };

  const stylistName = (id: string | null) => stylists.find((s) => s.id === id)?.name || "—";

  // Tags row for the table: prefer the custom title; fall back to the
  // legacy role. Either way render the permission count next to it.
  const summaryFor = useMemo(
    () =>
      (u: User) => {
        const perms = Array.isArray(u.permissions) ? u.permissions : [];
        return { label: u.title || u.role, count: perms.length };
      },
    [],
  );

  if (status !== "authenticated" || !canManageUsers) return null;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">User Management</h1>
          <p className="text-navy/40 text-sm font-body mt-1">
            Create staff accounts, assign a custom title, and pick exactly which
            parts of the admin they can use.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add User
        </Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl mb-4">
              {editing ? `Edit ${editing.name}` : "Create User"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!editing && (
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                      required
                    />
                  </div>
                )}
                <div className={editing ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-body text-navy/40 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">
                  Title <span className="text-navy/30">(shown next to the user&apos;s name)</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Receptionist, Salon Manager, Lead Color Specialist"
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                />
              </div>

              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">
                  {editing ? "New password (leave blank to keep)" : "Password *"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-navy/20 px-3 py-2 text-sm font-body"
                  required={!editing}
                />
              </div>

              <div className="border-t border-navy/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-body font-medium text-navy">Permissions</p>
                    <p className="text-[11px] text-navy/40 mt-0.5">
                      What this person can do in the admin. Presets below set the boxes
                      to a sensible default — tweak any individual checkbox after.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset("admin")}
                      className="text-[11px] font-body px-3 py-1.5 border border-navy/20 hover:bg-navy/5"
                    >
                      Admin preset
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("manager")}
                      className="text-[11px] font-body px-3 py-1.5 border border-navy/20 hover:bg-navy/5"
                    >
                      Manager preset
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("none")}
                      className="text-[11px] font-body px-3 py-1.5 border border-navy/20 hover:bg-navy/5"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 border border-navy/10 rounded p-3 bg-cream/40">
                  {ALL_PERMISSIONS.map((p) => {
                    const meta = PERMISSION_META[p];
                    const checked = form.permissions.includes(p);
                    return (
                      <label
                        key={p}
                        className="flex items-start gap-2 cursor-pointer py-1"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p)}
                          className="mt-1 w-4 h-4"
                        />
                        <span>
                          <span className="block text-sm font-body text-navy">{meta.label}</span>
                          <span className="block text-[11px] font-body text-navy/50 leading-snug">
                            {meta.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selfWouldLoseManageUsers && (
                  <p className="text-[11px] text-amber-700 font-body mt-2">
                    You&apos;re editing your own account and unticked &ldquo;Manage users.&rdquo;
                    Re-tick it before saving — otherwise the only way back into this page
                    is another admin re-granting it.
                  </p>
                )}
              </div>

              <details className="border-t border-navy/10 pt-3">
                <summary className="cursor-pointer text-xs font-body text-navy/50 hover:text-navy">
                  Advanced — legacy role + stylist link
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">
                      Legacy role <span className="text-navy/30">(kept on the record for compat; permissions above are the source of truth)</span>
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value as "admin" | "manager" | "stylist" })
                      }
                      className="w-full border border-navy/20 px-3 py-2 text-sm font-body bg-white"
                    >
                      <option value="admin">admin</option>
                      <option value="manager">manager</option>
                      <option value="stylist">stylist</option>
                    </select>
                  </div>
                  {form.role === "stylist" && (
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">
                        Linked stylist record
                      </label>
                      <select
                        value={form.stylistId}
                        onChange={(e) => setForm({ ...form, stylistId: e.target.value })}
                        className="w-full border border-navy/20 px-3 py-2 text-sm font-body bg-white"
                      >
                        <option value="">— pick a stylist —</option>
                        {stylists.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </details>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                  disabled={!!editingSelf}
                />
                <span className="text-sm font-body">
                  Active
                  {editingSelf && (
                    <span className="text-[11px] text-navy/40 ml-2">
                      (you can&apos;t deactivate your own account)
                    </span>
                  )}
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-navy/20 text-sm font-body hover:bg-navy/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || selfWouldLoseManageUsers}
                  className="flex-1 px-4 py-2 bg-navy text-white text-sm font-body hover:bg-navy/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
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
          {users.map((u) => {
            const sum = summaryFor(u);
            const isMe = u.email.toLowerCase() === sessionEmail;
            return (
              <div
                key={u.id}
                className={`px-6 py-4 flex items-start justify-between gap-4 ${!u.active ? "opacity-50" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-body font-bold text-sm">{u.name}</p>
                    <Badge
                      tone={u.role === "admin" ? "accent" : u.role === "manager" ? "info" : "neutral"}
                      size="sm"
                    >
                      {sum.label}
                    </Badge>
                    <span className="text-[11px] text-navy/40 font-body">
                      {sum.count} {sum.count === 1 ? "permission" : "permissions"}
                    </span>
                    {!u.active && <Badge tone="neutral" size="sm">Inactive</Badge>}
                    {isMe && <Badge tone="accent" size="sm">You</Badge>}
                  </div>
                  <p className="text-navy/50 text-xs font-body">{u.email}</p>
                  {u.role === "stylist" && u.stylist_id && (
                    <p className="text-navy/40 text-xs font-body mt-0.5">
                      Linked to: {stylistName(u.stylist_id)}
                    </p>
                  )}
                  {Array.isArray(u.permissions) && u.permissions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {u.permissions.map((p) => {
                        const meta = (PERMISSION_META as Record<string, { label: string }>)[p];
                        return (
                          <span
                            key={p}
                            className="text-[10px] font-body bg-navy/5 text-navy/70 px-1.5 py-0.5 rounded"
                          >
                            {meta?.label || p}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(u)}>Edit</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmDeleteId(u.id)}
                    disabled={isMe}
                    title={isMe ? "You can't delete your own account." : undefined}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete User"
          message="This will permanently remove this user account."
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
