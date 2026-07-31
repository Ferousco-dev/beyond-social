import { type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The overview's own shape, not a spinner.
 *
 * Row counts and heights match the real panels, so the page does not reflow
 * when the data lands.
 */
export default function OverviewLoading(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, panel) => (
          <div key={panel} className="rounded-2xl border border-hairline bg-paper">
            <div className="flex items-baseline justify-between gap-3 px-4 pb-3 pt-3.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="border-t border-hairline">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="border-b border-hairline px-4 py-2.5 last:border-0">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, tile) => (
          <div key={tile} className="rounded-xl border border-hairline bg-paper p-3.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-14" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-hairline bg-paper p-4 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-24 w-full" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
        <div className="rounded-2xl border border-hairline bg-paper p-4">
          <Skeleton className="h-4 w-36" />
          <div className="mt-4 space-y-3.5">
            {Array.from({ length: 4 }).map((_, bar) => (
              <div key={bar}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-1 h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Skeleton className="h-4 w-32" />
        <div className="mt-3 overflow-hidden rounded-2xl border border-hairline">
          {Array.from({ length: 6 }).map((_, row) => (
            <div
              key={row}
              className="flex items-center gap-3 border-b border-hairline bg-paper px-4 py-2.5 last:border-0"
            >
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-3 w-20 sm:block" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
