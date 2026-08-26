export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-pulse">
      <div className="p-4 space-y-4">
        {/* Stats skeleton */}
        <div className="flex gap-3">
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-16 h-10 bg-gray-200 rounded"></th>
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="h-10 bg-gray-200 rounded mx-1" style={{ width: '120px' }}></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }).map((_, dayIdx) => (
                <tr key={dayIdx}>
                  <td className="h-8 bg-gray-100 rounded my-1" style={{ width: '60px' }}></td>
                  {Array.from({ length: 5 }).map((_, secIdx) => (
                    <td key={secIdx} className="h-8 bg-gray-100 rounded mx-1" style={{ width: '120px' }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="h-8 bg-gray-200 rounded mx-1"></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="h-6 bg-gray-100 rounded mx-1 my-1"></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-3 bg-gray-100 rounded w-2/3"></div>
        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>
  );
}
