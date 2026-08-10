import { type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/** Trends list placeholder. */
export default function TrendsLoading(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-hairline bg-paper p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
