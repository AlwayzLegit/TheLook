interface Props {
  slots: string[];
  loading: boolean;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function TimeSlots({ slots, loading, selectedDate, selectedTime, onSelectTime }: Props) {
  if (!selectedDate) {
    return (
      <div className="flex items-center justify-center text-navy/50 font-body text-sm">
        Select a date to see available times
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center text-navy/50 font-body text-sm">
        Loading available times...
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center justify-center text-navy/50 font-body text-sm text-center">
        No available slots for this date. Please try another day.
      </div>
    );
  }

  return (
    <div>
      <p className="font-body text-sm text-navy/50 mb-3">Available times:</p>
      <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
        {slots.map((slot) => (
          <button
            key={slot}
            onClick={() => onSelectTime(slot)}
            className={`py-2.5 px-3 text-sm font-body border transition-colors ${
              selectedTime === slot
                ? "bg-rose text-white border-rose"
                : "border-navy/10 text-navy hover:border-rose/30 hover:bg-rose/5"
            }`}
          >
            {formatTime(slot)}
          </button>
        ))}
      </div>
    </div>
  );
}
