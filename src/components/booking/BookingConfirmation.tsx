interface Props {
  result: {
    service: string;
    stylist: string;
    date: string;
    startTime: string;
    endTime: string;
  };
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function BookingConfirmation({ result }: Props) {
  return (
    <div className="text-center max-w-lg mx-auto">
      <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="font-heading text-3xl mb-2">You&apos;re All Set!</h2>
      <p className="text-navy/50 font-body text-sm mb-8">
        A confirmation email has been sent with your appointment details.
      </p>

      <div className="bg-white border border-navy/10 p-8 text-left space-y-4">
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Service</span>
          <span className="font-body font-bold text-sm">{result.service}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Stylist</span>
          <span className="font-body font-bold text-sm">{result.stylist}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Date</span>
          <span className="font-body font-bold text-sm">{formatDate(result.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Time</span>
          <span className="font-body font-bold text-sm">
            {formatTime(result.startTime)} – {formatTime(result.endTime)}
          </span>
        </div>
        <div className="border-t border-navy/10 pt-4 mt-4">
          <p className="text-navy/40 text-xs font-body">
            919 South Central Ave Suite #E, Glendale, CA 91204
          </p>
          <p className="text-navy/40 text-xs font-body">(818) 662-5665</p>
        </div>
      </div>

      <p className="text-navy/40 text-xs font-body mt-6">
        Need to cancel? Check your confirmation email for a cancellation link.
      </p>
    </div>
  );
}
