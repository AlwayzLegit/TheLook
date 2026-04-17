"use client";

import { useState, useEffect } from "react";
import CalendarGrid from "./CalendarGrid";
import TimeSlots from "./TimeSlots";

interface Props {
  stylistId: string;
  serviceIds: string[];
  onSelect: (date: string, time: string) => void;
  selectedDate: string | null;
  selectedTime: string | null;
}

export default function DateTimePicker({
  stylistId,
  serviceIds,
  onSelect,
  selectedDate,
  selectedTime,
}: Props) {
  const [date, setDate] = useState<string | null>(selectedDate);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const serviceIdsKey = serviceIds.join(",");

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setFetchError(false);
    fetch(`/api/availability?stylistId=${stylistId}&serviceIds=${serviceIdsKey}&date=${date}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        setSlots(data.slots || []);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setSlots([]);
        setLoading(false);
      });
  }, [date, stylistId, serviceIdsKey]);

  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Pick a Date &amp; Time</h2>
      <p className="text-navy/50 font-body text-sm text-center mb-8">
        Choose your preferred appointment slot
      </p>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <CalendarGrid
          selectedDate={date}
          onSelectDate={(d) => {
            setDate(d);
            setSlots([]);
          }}
        />
        <TimeSlots
          slots={slots}
          loading={loading}
          error={fetchError}
          selectedDate={date}
          selectedTime={selectedTime}
          onSelectTime={(time) => date && onSelect(date, time)}
        />
      </div>
    </div>
  );
}
