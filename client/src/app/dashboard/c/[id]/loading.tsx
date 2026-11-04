import { type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/** Conversation surface placeholder: a centered composer, as on first load. */
export default function ConversationLoading(): ReactNode {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-8 h-28 w-full rounded-3xl" />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
    </div>
  );
}
