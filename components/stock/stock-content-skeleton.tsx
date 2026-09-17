import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton shown while a stock tab or filter navigation is in flight, so the
 * content area visibly reacts instead of appearing unresponsive.
 */
export function StockContentSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat data stok">
      <div className="erp-surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-56 max-w-full rounded-md" />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-stone-200 bg-stone-50/60 p-4 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-10 flex-1 rounded-xl sm:min-w-56" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
        </div>

        <div className="hidden md:block">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex items-center gap-5 border-b border-stone-100 px-5 py-4 last:border-0">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="divide-y divide-stone-100 md:hidden">
          {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
            <div key={index} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
