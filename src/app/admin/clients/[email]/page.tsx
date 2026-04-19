"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminToast from "@/components/admin/AdminToast";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface Profile {
  email: string;
  name: string;
  phone: string | null;
  preferred_stylist_id: string | null;
  tags: string | null;
  preferences: string | null;
  internal_notes: string | null;
  allergy_info: string | null;
  hair_formulas: string | null;
  hair_type: string | null;
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

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  photo_type: string | null;
  appointment_id: string | null;
  service_id: string | null;
  taken_at: string | null;
  created_at: string;
}

interface Stylist { id: string; name: string; }
interface Service { id: string; name: string; price_min: number; category: string; }

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function formatCents(c: number) {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

const PHOTO_TYPES = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "result", label: "Result" },
  { value: "inspiration", label: "Inspiration" },
];

export default function ClientProfilePage({ params }: { params: Promise<{ email: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "photos" | "history" | "formulas">("profile");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredStylistId, setPreferredStylistId] = useState("");
  const [tags, setTags] = useState("");
  const [preferences, setPreferences] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [allergyInfo, setAllergyInfo] = useState("");
  const [hairFormulas, setHairFormulas] = useState("");
  const [hairType, setHairType] = useState("");
  const [birthday, setBirthday] = useState("");

  // Photo upload fields
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoType, setPhotoType] = useState("result");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    params.then((p) => setEmail(decodeURIComponent(p.email)));
  }, [params]);

  const loadData = () => {
    if (status !== "authenticated" || !email) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/admin/clients/${encodeURIComponent(email)}`).then((r) => r.json()),
      fetch("/api/admin/stylists").then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
    ]).then(([clientData, stys, svcs]) => {
      setAppointments(clientData.appointments || []);
      setPhotos(clientData.photos || []);
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
        setHairFormulas(p.hair_formulas || "");
        setHairType(p.hair_type || "");
        setBirthday(p.birthday || "");
      } else if (clientData.appointments?.length > 0) {
        const latest = clientData.appointments[0];
        setName(latest.client_name || "");
        setPhone(latest.client_phone || "");
      }
    }).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [status, email]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone,
          preferredStylistId: preferredStylistId || null,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          preferences, internalNotes, allergyInfo,
          hairFormulas, hairType, birthday,
        }),
      });
      if (res.ok) setToast({ type: "success", message: "Profile saved." });
      else setToast({ type: "error", message: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caption", photoCaption);
    fd.append("photoType", photoType);
    fd.append("takenAt", new Date().toISOString().split("T")[0]);

    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(email)}/photos`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        setToast({ type: "success", message: "Photo uploaded." });
        setPhotoCaption("");
        loadData();
      } else {
        const data = await res.json();
        setToast({ type: "error", message: data.error || "Upload failed." });
      }
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (id: string) => {
    const res = await fetch(`/api/admin/clients/${encodeURIComponent(email)}/photos?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setToast({ type: "success", message: "Photo deleted." });
      setPhotos(photos.filter((p) => p.id !== id));
    } else {
      setToast({ type: "error", message: "Failed to delete." });
    }
  };

  if (status !== "authenticated") return null;

  const svcMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const styMap = Object.fromEntries(stylists.map((s) => [s.id, s]));
  const billable = appointments.filter((a) => a.status === "confirmed" || a.status === "completed");
  const totalSpent = billable.reduce((s, a) => s + (svcMap[a.service_id]?.price_min || 0), 0);
  const noShows = appointments.filter((a) => a.status === "no_show").length;

  // Most used services
  const svcCounts: Record<string, number> = {};
  billable.forEach((a) => { svcCounts[a.service_id] = (svcCounts[a.service_id] || 0) + 1; });
  const topServices = Object.entries(svcCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ name: svcMap[id]?.name || "Unknown", count }));

  const parsedTags = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="p-4 sm:p-8">
      <Link href="/admin/clients" className="text-xs font-body text-navy/40 hover:text-navy mb-4 inline-block">&larr; Back to Clients</Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl">{name || email}</h1>
          <p className="text-navy/40 text-sm font-body">{email}{phone ? ` | ${phone}` : ""}</p>
          {parsedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {parsedTags.map((t) => (
                <span key={t} className="text-[10px] font-body bg-gold/15 text-gold px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 border border-navy/10 text-center">
            <p className="font-heading text-lg">{billable.length}</p>
            <p className="text-navy/40 text-[10px]">visits</p>
          </div>
          <div className="bg-white px-4 py-2 border border-navy/10 text-center">
            <p className="font-heading text-lg text-green-600">{formatCents(totalSpent)}</p>
            <p className="text-navy/40 text-[10px]">spent</p>
          </div>
          <div className="bg-white px-4 py-2 border border-navy/10 text-center">
            <p className="font-heading text-lg">{photos.length}</p>
            <p className="text-navy/40 text-[10px]">photos</p>
          </div>
          {noShows > 0 && (
            <div className="bg-white px-4 py-2 border border-navy/10 text-center">
              <p className="font-heading text-lg text-red-500">{noShows}</p>
              <p className="text-navy/40 text-[10px]">no-shows</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Link
          href={{
            pathname: "/book",
            query: { email, name, phone },
          }}
          className="inline-flex items-center gap-2 bg-rose hover:bg-rose-light text-white text-xs font-body uppercase tracking-widest px-5 py-2.5 transition-colors"
        >
          + New Appointment for this Client
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-navy/10">
        {(["profile", "photos", "history", "formulas"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-body capitalize transition-colors ${
              activeTab === tab ? "border-b-2 border-rose text-rose" : "text-navy/40 hover:text-navy"
            }`}
          >
            {tab === "formulas" ? "Hair & Formulas" : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-navy/40 font-body text-sm">Loading...</p>
      ) : (
        <>
          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 border border-navy/10">
                <h2 className="font-heading text-lg mb-4">Client Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">Name</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-navy/40 mb-1">Phone</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Tags</label>
                    <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VIP, color regular, sensitive scalp" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                    <p className="text-[10px] text-navy/30 mt-1">Comma-separated</p>
                  </div>
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Preferences & Style Notes</label>
                    <textarea value={preferences} onChange={(e) => setPreferences(e.target.value)} rows={3} placeholder="Prefers short layers, likes warm tones, always wants blowout after cut..." className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Allergy / Sensitivity Info</label>
                    <textarea value={allergyInfo} onChange={(e) => setAllergyInfo(e.target.value)} rows={2} placeholder="Allergic to ammonia, sensitive scalp..." className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Internal Notes (staff only)</label>
                    <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} placeholder="Always runs 10 min late, prefers morning appointments..." className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
                  </div>
                  <button onClick={saveProfile} disabled={saving} className="w-full bg-navy text-white text-sm font-body py-2.5 hover:bg-navy/90 disabled:opacity-60">
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>

              {/* Quick stats sidebar */}
              <div className="space-y-6">
                {topServices.length > 0 && (
                  <div className="bg-white p-5 border border-navy/10">
                    <h3 className="font-heading text-sm mb-3">Favorite Services</h3>
                    <div className="space-y-2">
                      {topServices.map((s) => (
                        <div key={s.name} className="flex justify-between text-sm font-body">
                          <span className="text-navy/60">{s.name}</span>
                          <span className="text-navy/40">{s.count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {profile?.hair_type && (
                  <div className="bg-white p-5 border border-navy/10">
                    <h3 className="font-heading text-sm mb-2">Hair Type</h3>
                    <p className="text-sm font-body text-navy/60">{profile.hair_type}</p>
                  </div>
                )}
                <div className="bg-white p-5 border border-navy/10">
                  <h3 className="font-heading text-sm mb-2">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <a href={`mailto:${email}`} className="text-xs font-body text-blue-600 border border-blue-200 px-3 py-1.5 hover:bg-blue-50">Email</a>
                    {phone && <a href={`tel:${phone}`} className="text-xs font-body text-green-600 border border-green-200 px-3 py-1.5 hover:bg-green-50">Call</a>}
                    <Link href={`/admin/appointments?search=${encodeURIComponent(email)}`} className="text-xs font-body text-navy border border-navy/20 px-3 py-1.5 hover:bg-navy/5">View Appointments</Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PHOTOS TAB ── */}
          {activeTab === "photos" && (
            <div>
              {/* Upload area */}
              <div className="bg-cream/50 border border-navy/10 p-5 mb-6">
                <h3 className="font-heading text-sm mb-3">Upload Photo</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Type</label>
                    <select value={photoType} onChange={(e) => setPhotoType(e.target.value)} className="border border-navy/20 px-3 py-2 text-sm font-body">
                      {PHOTO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-body text-navy/40 mb-1">Caption</label>
                    <input type="text" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} placeholder="e.g. Balayage - warm honey tones" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]); }} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-navy text-white text-sm font-body px-5 py-2 hover:bg-navy/90 disabled:opacity-60">
                      {uploading ? "Uploading..." : "Choose & Upload"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo grid */}
              {photos.length === 0 ? (
                <p className="text-navy/40 text-sm font-body">No photos yet. Upload the first one above.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <button onClick={() => setLightboxUrl(photo.url)} className="w-full aspect-square overflow-hidden rounded border border-navy/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.caption || "Client photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </button>
                      <div className="absolute top-2 left-2">
                        <span className={`text-[10px] font-body px-1.5 py-0.5 rounded ${
                          photo.photo_type === "before" ? "bg-amber-100 text-amber-700" :
                          photo.photo_type === "after" ? "bg-green-100 text-green-700" :
                          photo.photo_type === "inspiration" ? "bg-blue-100 text-blue-700" :
                          "bg-navy/10 text-navy/60"
                        }`}>
                          {photo.photo_type || "photo"}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeletePhotoId(photo.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        &times;
                      </button>
                      {photo.caption && (
                        <p className="text-xs font-body text-navy/50 mt-1.5 truncate">{photo.caption}</p>
                      )}
                      <p className="text-[10px] font-body text-navy/30">{photo.taken_at || ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === "history" && (
            <div>
              <h2 className="font-heading text-lg mb-4">Appointment History ({appointments.length})</h2>
              {appointments.length === 0 ? (
                <p className="text-navy/40 text-sm font-body">No appointments found.</p>
              ) : (
                <div className="bg-white border border-navy/10 divide-y divide-navy/5">
                  {appointments.map((a) => (
                    <div key={a.id} className="px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-body font-bold">{svcMap[a.service_id]?.name || "Unknown"}</p>
                            <span className="text-[10px] font-body text-navy/30">{svcMap[a.service_id]?.category}</span>
                          </div>
                          <p className="text-xs font-body text-navy/40">
                            with {styMap[a.stylist_id]?.name || "Unknown"} &middot; {a.date} &middot; {formatTime(a.start_time)} – {formatTime(a.end_time)}
                          </p>
                          {a.notes && <p className="text-xs font-body text-navy/30 mt-1 italic">&ldquo;{a.notes}&rdquo;</p>}
                          {a.staff_notes && (
                            <p className="text-xs font-body mt-1 bg-cream/50 px-2 py-1 border-l-2 border-gold/40">Staff: {a.staff_notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <span className={`text-xs font-body px-2 py-0.5 ${
                            a.status === "confirmed" ? "bg-green-100 text-green-700" :
                            a.status === "completed" ? "bg-blue-100 text-blue-700" :
                            a.status === "cancelled" ? "bg-red-100 text-red-700" :
                            a.status === "no_show" ? "bg-gray-100 text-gray-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>{a.status}</span>
                          <p className="text-xs font-body text-navy/40 mt-1">{formatCents(svcMap[a.service_id]?.price_min || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FORMULAS TAB ── */}
          {activeTab === "formulas" && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 border border-navy/10">
                <h2 className="font-heading text-lg mb-4">Hair Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Hair Type</label>
                    <input type="text" value={hairType} onChange={(e) => setHairType(e.target.value)} placeholder="e.g. Fine, straight, natural level 6, 40% grey" className="w-full border border-navy/20 px-3 py-2 text-sm font-body" />
                  </div>
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Color Formulas & Treatments</label>
                    <textarea value={hairFormulas} onChange={(e) => setHairFormulas(e.target.value)} rows={8}
                      placeholder={"Last color (Jan 2026):\n  Roots: Wella Koleston 7/1 + 6% 1:1\n  Lengths: 9/16 + 1.9% gloss\n  Process: 35 min roots, 10 min gloss\n\nKeratin (Nov 2025):\n  GK The Best treatment\n  Left on 30 min"}
                      className="w-full border border-navy/20 px-3 py-2 text-sm font-body font-mono resize-none" />
                    <p className="text-[10px] text-navy/30 mt-1">Free-form — record color formulas, processing times, products used</p>
                  </div>
                  <div>
                    <label className="block text-xs font-body text-navy/40 mb-1">Allergy / Sensitivity</label>
                    <textarea value={allergyInfo} onChange={(e) => setAllergyInfo(e.target.value)} rows={2} placeholder="Sensitive to ammonia, patch test required..." className="w-full border border-navy/20 px-3 py-2 text-sm font-body resize-none" />
                  </div>
                  <button onClick={saveProfile} disabled={saving} className="w-full bg-navy text-white text-sm font-body py-2.5 hover:bg-navy/90 disabled:opacity-60">
                    {saving ? "Saving..." : "Save Hair Profile"}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-5 border border-navy/10">
                  <h3 className="font-heading text-sm mb-3">Service History Summary</h3>
                  {topServices.length > 0 ? (
                    <div className="space-y-2">
                      {topServices.map((s) => (
                        <div key={s.name} className="flex justify-between text-sm font-body">
                          <span className="text-navy/60">{s.name}</span>
                          <span className="text-navy/40">{s.count} time{s.count !== 1 ? "s" : ""}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-navy/30 text-xs font-body">No completed services yet</p>
                  )}
                </div>
                {photos.filter((p) => p.photo_type === "result" || p.photo_type === "after").length > 0 && (
                  <div className="bg-white p-5 border border-navy/10">
                    <h3 className="font-heading text-sm mb-3">Recent Results</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.filter((p) => p.photo_type === "result" || p.photo_type === "after").slice(0, 6).map((p) => (
                        <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="aspect-square overflow-hidden rounded">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={p.caption || ""} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">&times;</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Delete photo confirmation */}
      {deletePhotoId && (
        <ConfirmModal
          title="Delete Photo"
          message="Are you sure you want to delete this photo?"
          onConfirm={() => { deletePhoto(deletePhotoId); setDeletePhotoId(null); }}
          onCancel={() => setDeletePhotoId(null)}
        />
      )}

      {toast && <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
