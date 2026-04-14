export default function AppointmentsLoading() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-9 w-32 bg-gray-200 animate-pulse rounded" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
