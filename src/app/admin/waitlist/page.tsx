"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

 
interface WaitlistEntry {
  id: string;
  service_id: string;
  stylist_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  preferred_date: string | null;
  preferred_time_range: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  // Supabase embed shape — `select("*, services(name), stylists(name)")`
  // returns either a single matched row or null when there's no match.
  services?: { name: string } | null;
  stylists?: { name: string } | null;
}

export default function WaitlistPage() {
  const { status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/waitlist");
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  const markBooked = async (id: string) => {
    const res = await fetch(`/api/admin/waitlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "booked" }),
    });
    if (res.ok) {
      setToast({ type: "success", message: "Marked as booked." });
      load();
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/waitlist/${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ type: "success", message: "Removed." });
      load();
    }
  };

  if (status !== "authenticated") return null;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">Waitlist</h1>
          <p className="text-navy/40 text-sm font-body mt-1">Clients waiting for cancellations</p>
        </div>
        <span className="text-sm font-body text-navy/40">{entries.length} waiting</span>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading...</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No one on the waitlist"
          description="Clients who opt into the waitlist when their preferred slot is full will show up here."
        />
      ) : (
        <div className="bg-white border border-navy/10 divide-y divide-navy/5">
          {entries.map((e) => (
            <div key={e.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-body font-bold text-sm">{e.client_name}</p>
                <p className="text-navy/50 text-xs font-body">
                  {e.client_email}{e.client_phone ? ` | ${e.client_phone}` : ""}
                </p>
                <p className="text-navy/60 text-sm font-body mt-1">
                  Wants: {e.services?.name || "Unknown service"}
                  {e.stylists?.name ? ` with ${e.stylists.name}` : " (any stylist)"}
                </p>
                {(e.preferred_date || e.preferred_time_range) && (
                  <p className="text-navy/40 text-xs font-body mt-0.5">
                    Preferred: {e.preferred_date || "any date"} {e.preferred_time_range ? `, ${e.preferred_time_range}` : ""}
                  </p>
                )}
                {e.notes && <p className="text-navy/40 text-xs italic mt-1 font-body">&ldquo;{e.notes}&rdquo;</p>}
                <p className="text-navy/30 text-[10px] font-body mt-1">
                  Joined {new Date(e.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={`mailto:${e.client_email}?subject=Appointment opening at The Look&body=Hi ${e.client_name}, we have an opening that matches what you're looking for!`}
                  className="inline-flex items-center justify-center rounded-md font-medium tracking-[0.02em] transition-colors duration-150 whitespace-nowrap select-none h-8 px-3 text-[0.8125rem] gap-1.5 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-cream-50)]"
                >
                  Notify
                </a>
                <Button variant="primary" size="sm" onClick={() => markBooked(e.id)}>Booked</Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteId(e.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmModal title="Remove from Waitlist" message="Remove this entry permanently?"
          onConfirm={() => { remove(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)} />
      )}
      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
