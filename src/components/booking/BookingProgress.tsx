const steps = ["Service", "Stylist", "Date & Time", "Your Info", "Confirm"];

export default function BookingProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-body ${
                i < current
                  ? "bg-rose text-white"
                  : i === current
                    ? "bg-navy text-white"
                    : "bg-navy/10 text-navy/70"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`hidden sm:inline text-xs font-body ${
                i <= current ? "text-navy" : "text-navy/70"
              }`}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-6 sm:w-10 h-px ${
                i < current ? "bg-rose" : "bg-navy/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
