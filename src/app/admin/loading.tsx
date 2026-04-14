export default function AdminLoading() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm space-y-3">
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-200 animate-pulse rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
