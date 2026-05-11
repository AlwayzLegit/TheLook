// Permission catalogue + helpers. Replaces the old hardcoded
// admin / manager / stylist role check across the admin surface.
//
// Owner-led architecture: instead of a fixed role enum, every admin
// user has a free-form `title` (rendered in the UI) and an array of
// permission strings (gates every API + page). Admin creates users in
// /admin/users, types in whatever title fits, and ticks the
// permission boxes that match. The only baked-in distinction is
// `manage_users` itself — without it a user can't create or delete
// other users. Everything else is just a flag.
//
// Permission keys are stable strings (text[] in admin_users.permissions).
// They double as the i18n / display key in the UI through PERMISSION_META.
// Adding one means: update the union below + PERMISSION_META + the
// route that consumes it.

export const ALL_PERMISSIONS = [
  "manage_users",
  "manage_settings",
  "view_analytics",
  "manage_bookings",
  "manage_clients",
  "manage_content",
  "manage_catalog",
  "manage_team",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface PermissionMeta {
  label: string;
  description: string;
}

// Display copy for /admin/users checkbox UI. Keep concise — the
// checkbox row is tight on horizontal space and the description
// renders inline as a hint.
export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  manage_users: {
    label: "Manage users",
    description:
      "Create, edit, and delete admin/staff accounts and assign permissions.",
  },
  manage_settings: {
    label: "Manage settings",
    description:
      "Global salon settings — branding text, reminder templates, deposit rules, notifications, SMS toggles, security.",
  },
  view_analytics: {
    label: "View analytics",
    description:
      "Analytics dashboards, activity log, and error feed.",
  },
  manage_bookings: {
    label: "Manage bookings",
    description:
      "Appointments, schedule, waitlist, walk-ins, refunds, and review-request sends.",
  },
  manage_clients: {
    label: "Manage clients",
    description: "Client list, messages, and SMS/email broadcasts.",
  },
  manage_content: {
    label: "Manage content",
    description: "Blog posts, blog categories, and the public gallery.",
  },
  manage_catalog: {
    label: "Manage catalog",
    description: "Services, variants, retail products, and discount codes.",
  },
  manage_team: {
    label: "Manage team",
    description:
      "Stylist profiles, commissions, and team-member display data (no role/permission changes).",
  },
};

// Default permission set for the "Admin" preset in the create-user
// drawer. Equivalent to checking every box.
export const ADMIN_PRESET: ReadonlyArray<Permission> = ALL_PERMISSIONS;

// Default set for the "Manager" preset — every permission except
// user management. Matches the post-migration backfill so an admin
// who flips the preset toggle sees the same boxes ticked as a
// pre-existing manager.
export const MANAGER_PRESET: ReadonlyArray<Permission> = ALL_PERMISSIONS.filter(
  (p) => p !== "manage_users",
);

// Type guard — narrows an arbitrary string to a known Permission so
// DB rows / request bodies can be validated cheaply without zod.
export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (ALL_PERMISSIONS as readonly string[]).includes(value);
}

// Filter an arbitrary string[] (e.g. a DB row or a request body) down
// to the recognised permission set. Used everywhere we hydrate a
// session or accept a permission write so unknown values never leak
// through to gate decisions.
export function sanitizePermissions(input: unknown): Permission[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<Permission>();
  for (const v of input) {
    if (isPermission(v)) seen.add(v);
  }
  return Array.from(seen);
}

// Core gate predicate. `permissions` is the array we hydrated onto
// the session/JWT; `required` is the single permission a route or
// page asks for. Returns false on null/empty so the calling code
// doesn't have to short-circuit.
export function hasPermission(
  permissions: ReadonlyArray<string> | null | undefined,
  required: Permission,
): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.includes(required);
}

// Same as hasPermission but accepts multiple required permissions and
// returns true if ANY match. Rare — most call sites need exactly one
// permission — but useful for combined dashboards like /admin/me.
export function hasAnyPermission(
  permissions: ReadonlyArray<string> | null | undefined,
  required: ReadonlyArray<Permission>,
): boolean {
  if (!permissions || permissions.length === 0) return false;
  return required.some((p) => permissions.includes(p));
}

// "Has at least one permission" — used by middleware to decide
// whether the user gets into the admin shell at all. A user with no
// permissions can still hold a stylist session for /my, but the
// /admin/* surface stays gated.
export function hasAnyAdminPermission(
  permissions: ReadonlyArray<string> | null | undefined,
): boolean {
  if (!permissions) return false;
  return permissions.length > 0;
}
