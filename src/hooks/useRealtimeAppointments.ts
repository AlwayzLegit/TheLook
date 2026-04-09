"use client";

import { useEffect, useState, useCallback } from "react";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service_id: string;
  stylist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface UseRealtimeAppointmentsOptions {
  enabled?: boolean;
  pollMs?: number;
}

export function useRealtimeAppointments(options: UseRealtimeAppointmentsOptions = {}) {
  const { enabled = true, pollMs = 15000 } = options;
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
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/admin/appointments?from=${today}`);
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
  }, [enabled]);

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
