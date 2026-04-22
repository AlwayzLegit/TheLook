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
}

export function usePolledAppointments(options: UsePolledAppointmentsOptions = {}) {
  const { enabled = true, pollMs = POLLING.APPOINTMENTS_MS, archived = false } = options;
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
    if (archived) params.set("archived", "true");
    else params.set("from", todayISOInLA());
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
  }, [enabled, archived]);

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
