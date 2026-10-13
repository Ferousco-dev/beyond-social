import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Loading placeholder. A skeleton should mirror the shape of the content it
 * replaces so the layout does not shift when data arrives, which reads as far
 * more considered than a spinner.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-md bg-cloud/70", className)} {...props} />
  );
}
