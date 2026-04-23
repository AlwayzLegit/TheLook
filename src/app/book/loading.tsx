export default function BookingLoading() {
  return (
    <main className="min-h-[100dvh] bg-cream pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        {/* Progress bar skeleton */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-navy/10 animate-pulse" />
              {i < 4 && <div className="w-8 h-[1px] bg-navy/10" />}
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="bg-white p-8 space-y-6">
          <div className="h-6 w-48 bg-navy/10 animate-pulse rounded mx-auto" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-navy/5 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
