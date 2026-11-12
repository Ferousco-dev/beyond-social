import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Loading shapes that match the pages they stand in for: same column width,
 * same heading, same blocks, so the swap to real content moves nothing.
 * One shimmer, one colour; blocks are drawn at the size the real ones settle at.
 */

const SHIMMER = "animate-pulse rounded-lg bg-cloud motion-reduce:animate-none";

export function Bone({ className }: { className?: string }): ReactNode {
  return <div className={cn(SHIMMER, className)} />;
}

const WIDTH = { narrow: "max-w-2xl", medium: "max-w-4xl", wide: "max-w-6xl" } as const;

/** The frame every page opens with: heading and a one-line lede. */
function Frame({ width, label, children, lede = true }: { width: keyof typeof WIDTH; label: string; children: ReactNode; lede?: boolean }): ReactNode {
  return (
    <div className={cn("mx-auto w-full px-4 py-8 sm:py-10", WIDTH[width])} aria-busy>
      <span className="sr-only">{label}</span>
      <Bone className="h-8 w-44 rounded-md" />
      {lede ? <Bone className="mt-3 h-4 w-full max-w-sm bg-cloud/70" /> : null}
      {children}
    </div>
  );
}

function ListRows({ rows, className }: { rows: number; className?: string }): ReactNode {
  return (
    <div className={cn("divide-y divide-hairline rounded-xl border border-hairline bg-paper", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-32" />
            <Bone className="h-3.5 w-full max-w-xs bg-cloud/70" />
          </div>
          <Bone className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

/** A heading with a list of rows: schedule, connections, usage and similar. */
export function SkeletonPage({ rows = 3, label = "Loading", width = "narrow" }: { rows?: number; label?: string; width?: keyof typeof WIDTH }): ReactNode {
  return (
    <Frame width={width} label={label}>
      <ListRows rows={rows} className="mt-6" />
    </Frame>
  );
}

/** Schedule: a calendar, then the list under it. */
export function SkeletonSchedule(): ReactNode {
  return (
    <Frame width="narrow" label="Loading your schedule">
      <Bone className="mt-6 h-72 rounded-2xl" />
      <ListRows rows={3} className="mt-6" />
    </Frame>
  );
}

/** Analytics: four figures, the chart, then two panels. */
export function SkeletonAnalytics(): ReactNode {
  return (
    <Frame width="medium" label="Loading analytics">
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="rounded-2xl border border-hairline bg-paper p-4">
            <Bone className="h-3 w-16 bg-cloud/70" />
            <Bone className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>
      <Bone className="mt-4 h-72 rounded-2xl" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Bone className="h-48 rounded-2xl" />
        <Bone className="h-48 rounded-2xl" />
      </div>
    </Frame>
  );
}

/** Projects: a grid of portrait video tiles. */
export function SkeletonGrid({ label = "Loading" }: { label?: string }): ReactNode {
  return (
    <Frame width="wide" label={label}>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, tile) => (
          <div key={tile}>
            <Bone className="aspect-[9/16] rounded-xl" />
            <Bone className="mt-2 h-3.5 w-3/4 bg-cloud/70" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** A settings section: no page heading, because the settings frame already has one. */
export function SkeletonSettings(): ReactNode {
  return (
    <div className="mt-6 space-y-6 lg:mt-8" aria-busy>
      <span className="sr-only">Loading</span>
      <div className="rounded-xl border border-hairline bg-paper p-5">
        <Bone className="h-4 w-24" />
        <Bone className="mt-4 h-8 w-32" />
        <Bone className="mt-3 h-4 w-full max-w-md bg-cloud/70" />
        <Bone className="mt-5 h-11 w-44" />
      </div>
      <ListRows rows={3} />
    </div>
  );
}

/**
 * The home screen, which is not shaped like the pages above: a greeting and a
 * composer, centred in the viewport rather than running from the top.
 */
export function SkeletonHome(): ReactNode {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12" aria-busy>
      <span className="sr-only">Loading</span>
      <div className="mb-10 flex min-h-[2.5rem] justify-center">
        <Bone className="h-8 w-64 rounded-md" />
      </div>
      <Bone className="h-28 w-full rounded-3xl bg-cloud/60" />
    </div>
  );
}
