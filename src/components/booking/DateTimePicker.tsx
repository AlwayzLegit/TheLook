"use client";

import { useState, useEffect } from "react";
import CalendarGrid from "./CalendarGrid";
import TimeSlots from "./TimeSlots";

interface Props {
  stylistId: string;
  // Human-readable label for the heading ("with Janet" vs "with any available stylist").
  stylistName?: string;
  serviceIds: string[];
  // Aligned by index with serviceIds. Empty string = no variant for that slot.
  variantIds?: string[];
  onSelect: (date: string, time: string) => void;
  selectedDate: string | null;
  selectedTime: string | null;
  // Called from the "Change stylist" link in the empty-state message so
  // the parent page can bounce back to the stylist step.
  onChangeStylist?: () => void;
}

export default function DateTimePicker({
  stylistId,
  stylistName,
  serviceIds,
  variantIds,
  onSelect,
  selectedDate,
  selectedTime,
  onChangeStylist,
}: Props) {
  const [date, setDate] = useState<string | null>(selectedDate);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const serviceIdsKey = serviceIds.join(",");
  const variantIdsKey = (variantIds || []).join(",");

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setFetchError(false);
    const vParam = variantIdsKey ? `&variantIds=${variantIdsKey}` : "";
    fetch(`/api/availability?stylistId=${stylistId}&serviceIds=${serviceIdsKey}${vParam}&date=${date}`)
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
  }, [date, stylistId, serviceIdsKey, variantIdsKey]);

  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Pick a Date &amp; Time</h2>
      <p className="text-navy/50 font-body text-sm text-center mb-8">
        {stylistName ? `Showing availability with ${stylistName}` : "Choose your preferred appointment slot"}
        {onChangeStylist ? (
          <>
            {" · "}
            <button
              type="button"
              onClick={onChangeStylist}
              className="underline hover:text-rose transition-colors"
            >
              Change stylist
            </button>
          </>
        ) : null}
      </p>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <CalendarGrid
          selectedDate={date}
          onSelectDate={(d) => {
            setDate(d);
            setSlots([]);
          }}
          onMonthChange={() => {
            // Month nav: the previously-shown slots no longer correspond to
            // a visible date, so blank them until the user picks again.
            setDate(null);
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
          // Pass the "Change stylist" callback down so the empty-state
          // message inside TimeSlots can surface it as an inline action.
          onChangeStylist={onChangeStylist}
        />
      </div>
    </div>
  );
}
