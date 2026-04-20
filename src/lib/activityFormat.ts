// Turns raw admin_log rows into human-readable summaries for the activity
// feed. Each action type gets a short verb phrase + optional icon category
// so entries are scannable at a glance.

export type ActivityCategory = "booking" | "service" | "stylist" | "schedule" | "user" | "settings" | "client" | "auth" | "other";

export interface ActivityView {
  title: string;
  category: ActivityCategory;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryParse(details: string | null): any {
  if (!details) return null;
  try { return JSON.parse(details); } catch { return null; }
}

export function formatActivity(action: string, details: string | null): ActivityView {
  const d = tryParse(details);

  // Bookings
  if (action.startsWith("appointment.")) {
    if (action === "appointment.create") {
      const who = d?.client || d?.email;
      const when = d?.date ? `${d.date} at ${d.time}` : "";
      return { title: `Created booking${who ? ` for ${who}` : ""}${when ? ` · ${when}` : ""}`, category: "booking" };
    }
    if (action === "appointment.update") {
      const parts: string[] = [];
      if (d?.status) parts.push(`status → ${d.status}`);
      if (d?.date) parts.push(`date → ${d.date}`);
      if (d?.start_time) parts.push(`start → ${d.start_time}`);
      if (d?.staff_notes !== undefined) parts.push("staff notes edited");
      return { title: `Updated booking${parts.length ? ` · ${parts.join(", ")}` : ""}`, category: "booking" };
    }
    if (action === "appointment.delete") return { title: "Deleted booking", category: "booking" };
    if (action === "appointment.archive") return { title: "Archived booking", category: "booking" };
    if (action === "appointment.unarchive") return { title: "Restored archived booking", category: "booking" };
    if (action === "appointment.chargefee.success") {
      const amt = d?.amountCents ? `$${(d.amountCents / 100).toFixed(2)}` : "";
      return { title: `Charged cancellation fee${amt ? ` ${amt}` : ""}`, category: "booking" };
    }
    if (action === "appointment.chargefee.failed") return { title: "Cancellation-fee charge failed", category: "booking" };
    if (action === "appointment.chargefee.requires_action") return { title: "Cancellation-fee charge requires 3DS re-auth", category: "booking" };
    return { title: action.replace(/^appointment\./, "Appointment: "), category: "booking" };
  }

  // Services
  if (action.startsWith("service.")) {
    if (action === "service.create") return { title: `Created service${d?.name ? ` "${d.name}"` : ""}`, category: "service" };
    if (action === "service.update") return { title: `Updated service${d?.name ? ` "${d.name}"` : ""}`, category: "service" };
    if (action === "service.delete") return { title: "Deleted service", category: "service" };
    if (action === "service.variants.update") return { title: `Updated service variants${d?.count != null ? ` (${d.count})` : ""}`, category: "service" };
    return { title: action, category: "service" };
  }

  // Stylists
  if (action.startsWith("stylist.")) {
    if (action === "stylist.create") return { title: `Added stylist${d?.name ? ` "${d.name}"` : ""}`, category: "stylist" };
    if (action === "stylist.update") return { title: `Edited stylist${d?.name ? ` "${d.name}"` : ""}`, category: "stylist" };
    if (action === "stylist.delete") return { title: "Removed stylist", category: "stylist" };
    if (action === "stylist.self_update") return { title: "Stylist updated their profile", category: "stylist" };
    if (action === "stylist.self_services_update") return { title: `Stylist updated offered services${d?.count != null ? ` (${d.count})` : ""}`, category: "stylist" };
    return { title: action, category: "stylist" };
  }

  // Schedule
  if (action.startsWith("schedule.")) {
    if (action === "schedule.delete") return { title: "Deleted schedule rule", category: "schedule" };
    return { title: action.replace(/^schedule\./, "Schedule: "), category: "schedule" };
  }

  // Users / auth
  if (action === "user.create") return { title: `Invited admin${d?.email ? ` ${d.email}` : ""}`, category: "user" };
  if (action.startsWith("user.")) return { title: action, category: "user" };

  // Auth events
  if (action === "auth.login.success") return { title: "Admin signed in", category: "auth" };
  if (action === "auth.login.failed") {
    const why = d?.reason === "rate_limited" ? "rate-limited" : d?.reason === "bad_credentials_locked_account" ? "bad password · account locked" : "bad password";
    return { title: `Failed login (${why})`, category: "auth" };
  }
  if (action === "auth.login.locked") return { title: "Blocked login attempt (account locked)", category: "auth" };
  if (action === "auth.logout") return { title: "Admin signed out", category: "auth" };
  if (action === "auth.signout_idle") return { title: "Signed out after idle timeout", category: "auth" };

  // Settings
  if (action === "settings.update") {
    const keys = Array.isArray(d) ? d : [];
    return { title: `Updated settings${keys.length ? ` (${keys.join(", ")})` : ""}`, category: "settings" };
  }

  // Clients
  if (action === "client.profile_update") return { title: `Updated client profile${d?.email ? ` (${d.email})` : ""}`, category: "client" };
  if (action === "clients.import") {
    const parts: string[] = [];
    if (d?.inserted != null) parts.push(`${d.inserted} new`);
    if (d?.updated != null) parts.push(`${d.updated} updated`);
    if (d?.skipped != null) parts.push(`${d.skipped} skipped`);
    return { title: `Imported clients${parts.length ? ` · ${parts.join(" · ")}` : ""}`, category: "client" };
  }

  // Discounts / products / misc
  if (action.startsWith("discount.")) return { title: action.replace(/^discount\./, "Discount: "), category: "other" };
  if (action.startsWith("product.")) return { title: action.replace(/^product\./, "Product: "), category: "other" };
  if (action.startsWith("waitlist.")) return { title: action.replace(/^waitlist\./, "Waitlist: "), category: "other" };
  if (action === "message.delete") return { title: "Deleted contact message", category: "other" };

  return { title: action, category: "other" };
}

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  booking: "bg-blue-100 text-blue-800",
  service: "bg-emerald-100 text-emerald-800",
  stylist: "bg-purple-100 text-purple-800",
  schedule: "bg-amber-100 text-amber-800",
  user: "bg-rose-100 text-rose-800",
  settings: "bg-navy/10 text-navy",
  client: "bg-teal-100 text-teal-800",
  auth: "bg-slate-200 text-slate-800",
  other: "bg-navy/5 text-navy/70",
};
