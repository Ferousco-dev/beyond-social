import { type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the overview layout so the page does not reflow when data lands. */
export default function OverviewLoading(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-paper p-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-hairline bg-paper p-5 lg:col-span-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-40 w-full" />
        </div>
        <div className="rounded-2xl border border-hairline bg-paper p-5">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-hairline bg-paper p-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
      </div>

      <Skeleton className="mt-8 h-4 w-32" />
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-paper p-2.5">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="mt-2.5 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
