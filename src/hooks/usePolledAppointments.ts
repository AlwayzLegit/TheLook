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
}

interface UsePolledAppointmentsOptions {
  enabled?: boolean;
  pollMs?: number;
  // When true, fetch archived appointments instead of the active list. The
  // archive view wants to see *all* past archived bookings so we also skip
  // the default `from=today` filter.
  archived?: boolean;
  // When true, include is_test=true rows. Defaults false so test data
  // never leaks into the regular admin view.
  includeTest?: boolean;
  // Override the server-side `from` date. Undefined uses the default
  // "today forward" scope. A YYYY-MM-DD string fetches from that date.
  // An empty string fetches all time with no lower bound.
  fromDate?: string;
}

export function usePolledAppointments(options: UsePolledAppointmentsOptions = {}) {
  const { enabled = true, pollMs = POLLING.APPOINTMENTS_MS, archived = false, includeTest = false, fromDate } = options;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (archived) {
      params.set("archived", "true");
    } else if (fromDate === undefined) {
      // Default scope: today forward. Empty string = caller asked for all time.
      params.set("from", todayISOInLA());
    } else if (fromDate !== "") {
      params.set("from", fromDate);
    }
    if (includeTest) params.set("includeTest", "true");
    const res = await fetch(`/api/admin/appointments?${params.toString()}`);
    if (!res.ok) {
      setError("Failed to fetch appointments.");
      setLoading(false);
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
      setLoading(false);
    }
  }, [enabled, archived, includeTest, fromDate]);

  useEffect(() => {
    if (!enabled) {
      setAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }

    fetchAppointments();

    const interval = setInterval(fetchAppointments, pollMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, fetchAppointments, pollMs]);

  return { appointments, loading, error, lastUpdate, refresh: fetchAppointments };
}
