import { type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The card list's own shape, so the page does not reflow when the rows land.
 * Three rows because that is a plausible queue, not because it fills the fold.
 */
export default function ScheduleLoading(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-64" />

      <Skeleton className="mt-8 h-4 w-24" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: 3 }).map((_, row) => (
          <div key={row} className="flex gap-3 rounded-xl border border-hairline bg-paper p-4">
            <Skeleton className="aspect-[9/16] w-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-3/4" />
              <Skeleton className="mt-1.5 h-4 w-1/2" />
              <Skeleton className="mt-3 h-11 w-48 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
