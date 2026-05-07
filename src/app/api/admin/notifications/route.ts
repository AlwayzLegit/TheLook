import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { apiError, apiSuccess, logError } from "@/lib/apiResponse";
import { getSessionUser, isAdminOrManager } from "@/lib/roles";
import { NextRequest } from "next/server";

// GET /api/admin/notifications?unreadOnly=true
// Returns notifications visible to the calling user. Admins see everything
// addressed to recipient_role='admin' AND any per-stylist notifications.
// Stylists only see ones addressed to their stylist id.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);

  if (!hasSupabaseConfig) return apiSuccess({ items: [], unreadCount: 0 });

  const { searchParams } = request.nextUrl;
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (isAdminOrManager(user)) {
    query = query.or("recipient_role.eq.admin,recipient_stylist_id.not.is.null");
  } else if (user.stylistId) {
    query = query.eq("recipient_stylist_id", user.stylistId);
  } else {
    return apiSuccess({ items: [], unreadCount: 0 });
  }

  if (unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) {
    logError("notifications GET", error);
    return apiError("Failed to load notifications.", 500);
  }

  type NotificationRow = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    appointment_id: string | null;
    url: string | null;
    read_at: string | null;
    created_at: string;
    recipient_role: string | null;
    recipient_stylist_id: string | null;
  };
  const items = ((data || []) as NotificationRow[]).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    appointmentId: n.appointment_id,
    url: n.url,
    readAt: n.read_at,
    createdAt: n.created_at,
    recipientRole: n.recipient_role,
    recipientStylistId: n.recipient_stylist_id,
  }));
  const unreadCount = items.filter((n) => !n.readAt).length;
  return apiSuccess({ items, unreadCount });
}

// PATCH /api/admin/notifications  body: { ids?: string[], markAll?: boolean }
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!hasSupabaseConfig) return apiError("Database not configured.", 503);

  const body = await request.json().catch(() => ({}));
  const { ids, markAll } = body as { ids?: string[]; markAll?: boolean };

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() });

  if (markAll) {
    if (isAdminOrManager(user)) {
      query = query.or("recipient_role.eq.admin,recipient_stylist_id.not.is.null");
    } else if (user.stylistId) {
      query = query.eq("recipient_stylist_id", user.stylistId);
    } else {
      return apiSuccess({ updated: 0 });
    }
    query = query.is("read_at", null);
  } else if (Array.isArray(ids) && ids.length > 0) {
    query = query.in("id", ids);
    // Stylists can only mark their own notifications as read.
    if (!isAdminOrManager(user) && user.stylistId) {
      query = query.eq("recipient_stylist_id", user.stylistId);
    }
  } else {
    return apiError("ids[] or markAll required", 400);
  }

  const { error } = await query;
  if (error) {
    logError("notifications PATCH", error);
    return apiError("Failed to update notifications.", 500);
  }
  return apiSuccess({ ok: true });
}
