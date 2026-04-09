"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

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

export function useRealtimeAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initial fetch
  const fetchAppointments = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching appointments:", error);
      return;
    }

    setAppointments(data || []);
    setLoading(false);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    fetchAppointments();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel("appointments-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          console.log("Realtime appointment update:", payload);
          
          if (payload.eventType === "INSERT") {
            setAppointments((prev) => {
              // Check if already exists (avoid duplicates)
              if (prev.some((a) => a.id === payload.new.id)) return prev;
              return [...prev, payload.new as Appointment];
            });
          } else if (payload.eventType === "UPDATE") {
            setAppointments((prev) =>
              prev.map((a) =>
                a.id === payload.new.id ? (payload.new as Appointment) : a
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAppointments((prev) =>
              prev.filter((a) => a.id !== payload.old.id)
            );
          }
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppointments]);

  return { appointments, loading, lastUpdate, refresh: fetchAppointments };
}
