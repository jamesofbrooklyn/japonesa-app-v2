/**
 * Reusable skeleton loaders. Replaces the old "Loading..." text placeholders
 * with shimmer-styled blocks that match the table layout users will see.
 */

const PULSE = "animate-pulse rounded bg-stone-200";

export function SkeletonLine({
  width = "100%",
  height = "1rem",
}: {
  width?: string;
  height?: string;
}) {
  return <span className={`${PULSE} inline-block`} style={{ width, height }} />;
}

/**
 * Table skeleton — renders a header row and N body rows of placeholder cells.
 * Use as a drop-in for table loading states.
 */
export function TableSkeleton({
  rows = 5,
  cols = 4,
  showHeader = true,
}: {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        {showHeader && (
          <thead className="bg-stone-100">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-3 py-2">
                  <SkeletonLine width="60%" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t border-stone-100">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-3 py-2">
                  <SkeletonLine
                    width={c === 0 ? "70%" : c === cols - 1 ? "40%" : "55%"}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * KPI tile skeleton — for the Pulse / Money KPI grids.
 */
export function KpiSkeleton() {
  return (
    <div className="rounded border border-stone-200 bg-white p-3 shadow-sm">
      <SkeletonLine width="40%" height="0.625rem" />
      <div className="mt-2">
        <SkeletonLine width="65%" height="1.5rem" />
      </div>
      <div className="mt-1">
        <SkeletonLine width="50%" height="0.75rem" />
      </div>
    </div>
  );
}

/**
 * Card skeleton — for AI cards and other card-shaped containers.
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded border border-stone-200 bg-white p-4 shadow-sm space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height="0.875rem"
        />
      ))}
    </div>
  );
}
