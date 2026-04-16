"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminToast from "@/components/admin/AdminToast";

interface Profile {
  email: string;
  name: string;
  phone: string | null;
  preferred_stylist_id: string | null;
  tags: string | null;
  preferences: string | null;
  internal_notes: string | null;
  allergy_info: string | null;
  birthday: string | null;
}

interface Appointment {
  id: string;
  service_id: string;
  stylist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  staff_notes: string | null;
}

interface Stylist { id: string; name: string; }
interface Service { id: string; name: string; price_min: number; }

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function formatCents(c: number) {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export default function ClientProfilePage({ params }: { params: Promise<{ email: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredStylistId, setPreferredStylistId] = useState("");
  const [tags, setTags] = useState("");
  const [preferences, setPreferences] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [allergyInfo, setAllergyInfo] = useState("");
  const [birthday, setBirthday] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    params.then((p) => setEmail(decodeURIComponent(p.email)));
  }, [params]);

  useEffect(() => {
    if (status !== "authenticated" || !email) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/admin/clients/${encodeURIComponent(email)}`).then((r) => r.json()),
      fetch("/api/admin/stylists").then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
    ]).then(([clientData, stys, svcs]) => {
      setAppointments(clientData.appointments || []);
      setStylists(Array.isArray(stys) ? stys : []);
      setServices(Array.isArray(svcs) ? svcs : []);

      const p = clientData.profile;
      if (p) {
        setProfile(p);
        setName(p.name || "");
        setPhone(p.phone || "");
        setPreferredStylistId(p.preferred_stylist_id || "");
        setTags(p.tags ? JSON.parse(p.tags).join(", ") : "");
        setPreferences(p.preferences || "");
        setInternalNotes(p.internal_notes || "");
        setAllergyInfo(p.allergy_info || "");
        setBirthday(p.birthday || "");
      } else if (clientData.appointments?.length > 0) {
        const latest = clientData.appointments[0];
        setName(latest.client_name || "");
        setPhone(latest.client_phone || "");
      }
    }).finally(() => setLoading(false));
  }, [status, email]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          preferredStylistId: preferredStylistId || null,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          preferences,
          internalNotes,
          allergyInfo,
          birthday,
        }),
      });
      if (res.ok) setToast({ type: "success", message: "Profile saved." });
      else setToast({ type: "error", message: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (status !== "authenticated") return null;

  const svcMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const styMap = Object.fromEntries(stylists.map((s) => [s.id, s]));
  const billable = appointments.filter((a) => a.status === "confirmed" || a.status === "completed");
  const totalSpent = billable.reduce((s, a) => s + (svcMap[a.service_id]?.price_min || 0), 0);
  const noShows = appointments.filter((a) => a.status === "no_show").length;

  return (
    <div className="p-4 sm:p-8">
      <Link href="/admin/clients" className="text-xs font-body text-navy/40 hover:text-navy mb-4 inline-block">&larr; Back to Clients</Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl">{name || email}</h1>
          <p className="text-navy/40 text-sm font-body">{email}</p>
        </div>
        <div className="flex gap-3 text-sm font-body">
          <div className="bg-white px-4 py-2 border border-navy/10 text-center">
            <p className="font-heading text-lg">{billable.length}</p>
            <p className="text-navy/40 text-xs">visits</p>
          </div>
          <div className="bg-white px-4 py-2 border border-navy/10 text-center">
            <p className="font-heading text-lg text-green-600">{formatCents(totalSpent)}</p>
            <p className="text-navy/40 text-xs">spent</p>
          </div>
          {noShows > 0 && (
            <div className="bg-white px-4 py-2 border border-navy/10 text-center">
              <p className="font-heading text-lg text-red-500">{noShows}</p>
              <p className="text-navy/40 text-xs">no-shows</p>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading...</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile form */}
          <div className="bg-white p-6 border border-navy/10">
            <h2 className="font-heading text-lg mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Preferred Stylist</label>
                <select value={preferredStylistId} onChange={(e) => setPreferredStylistId(e.target.value)} className="w-full border border-navy/20 px-3 py-2 text-sm font-body">
                  <option value="">No preference</option>
                  {stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Birthday (MM-DD)</label>
                <input type="text" value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="03-15" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Tags (comma-separated)</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VIP, color regular, sensitive scalp" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Preferences</label>
                <textarea value={preferences} onChange={(e) => setPreferences(e.target.value)} rows={2} placeholder="Prefers short layers, likes warm tones..." className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Allergy / Sensitivity Info</label>
                <textarea value={allergyInfo} onChange={(e) => setAllergyInfo(e.target.value)} rows={2} placeholder="Allergic to ammonia-based products..." className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
              </div>
              <div>
                <label className="block text-xs font-body text-navy/40 mb-1">Internal Notes (staff only)</label>
                <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} placeholder="Always runs 10 min late, prefers morning appointments..." className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
              </div>
              <button onClick={saveProfile} disabled={saving} className="w-full bg-navy text-white text-sm font-body py-2 hover:bg-navy/90 disabled:opacity-60">
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          {/* Appointment history */}
          <div>
            <h2 className="font-heading text-lg mb-4">Appointment History ({appointments.length})</h2>
            {appointments.length === 0 ? (
              <p className="text-navy/40 text-sm font-body">No appointments found.</p>
            ) : (
              <div className="bg-white border border-navy/10 divide-y divide-navy/5 max-h-[600px] overflow-y-auto">
                {appointments.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-body font-bold">{svcMap[a.service_id]?.name || "Unknown"}</p>
                        <p className="text-xs font-body text-navy/40">
                          with {styMap[a.stylist_id]?.name || "Unknown"} &middot; {a.date} &middot; {formatTime(a.start_time)}
                        </p>
                        {a.notes && <p className="text-xs font-body text-navy/30 mt-1 italic">{a.notes}</p>}
                        {a.staff_notes && <p className="text-xs font-body text-gold mt-1">Staff: {a.staff_notes}</p>}
                      </div>
                      <span className={`text-xs font-body px-2 py-0.5 shrink-0 ${
                        a.status === "confirmed" ? "bg-green-100 text-green-700" :
                        a.status === "completed" ? "bg-blue-100 text-blue-700" :
                        a.status === "cancelled" ? "bg-red-100 text-red-700" :
                        a.status === "no_show" ? "bg-gray-100 text-gray-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{a.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
