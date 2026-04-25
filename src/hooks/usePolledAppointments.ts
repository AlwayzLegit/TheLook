"use client";

import { useEffect, useState, useCallback } from "react";
import { POLLING } from "@/lib/constants";
import { todayISOInLA } from "@/lib/datetime";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service_id: string;
  serviceIds?: string[];
  serviceNames?: string[];
  serviceName?: string;
  stylistName?: string;
  stylist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  staff_notes: string | null;
  reminder_sent: boolean;
  cancel_token: string | null;
  created_at: string;
  // Surfaced on the admin list so a small "Any" / "Requested" badge
  // can render next to the stylist name without opening the row.
  requested_stylist?: boolean | null;
  // Used by the review-request modal to warn admin if a review was
  // already sent (auto-on-completion or earlier manual fire).
  review_request_sent_at?: string | null;
}

interface UsePolledAppointmentsOptions {
  enabled?: boolean;
  pollMs?: number;
  // When true, fetch archived appointments instead of the active list. The
  // archive view wants to see *all* past archived bookings so we also skip
  // the default `from=today` filter.
  archived?: boolean;
  // Override the server-side `from` date. Undefined uses the default
  // "today forward" scope. A YYYY-MM-DD string fetches from that date.
  // An empty string fetches all time with no lower bound.
  fromDate?: string;
}

export function usePolledAppointments(options: UsePolledAppointmentsOptions = {}) {
  const { enabled = true, pollMs = POLLING.APPOINTMENTS_MS, archived = false, fromDate } = options;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // `loading` was previously set to true on every poll tick, which swapped
  // the entire list for a "Loading…" placeholder and collapsed the page,
  // scrolling the user back to the top every ~15s. Track the initial load
  // separately so background refreshes don't touch the rendered layout.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAppointments = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const { silent = false } = opts;
      if (!enabled) {
        setLoading(false);
        setError(null);
        return;
      }

      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (archived) {
        params.set("archived", "true");
      } else if (fromDate === undefined) {
        params.set("from", todayISOInLA());
      } else if (fromDate !== "") {
        params.set("from", fromDate);
      }
      const res = await fetch(`/api/admin/appointments?${params.toString()}`);
      if (!res.ok) {
        setError("Failed to fetch appointments.");
        if (!silent) setLoading(false);
        return;
      }
      try {
        const data = (await res.json()) as Appointment[];
        setAppointments(data || []);
        setError(null);
        setLastUpdate(new Date());
      } catch {
        setError("Invalid appointments response.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, archived, fromDate],
  );

  useEffect(() => {
    if (!enabled) {
      setAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }

    // First run paints the skeleton; every subsequent tick is silent so
    // the visible list stays in place while the fetch completes in the
    // background — prevents the scroll-to-top jump the owner reported.
    fetchAppointments();

    const interval = setInterval(() => fetchAppointments({ silent: true }), pollMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, fetchAppointments, pollMs]);

  return { appointments, loading, error, lastUpdate, refresh: fetchAppointments };
}
