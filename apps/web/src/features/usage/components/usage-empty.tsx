import Link from "next/link";

import { rangeLabel, type UsageRangeId } from "../lib/range";

/**
 * Nothing ran in this range. A chart of zeroes would look like measured data,
 * so there is no chart here at all.
 */
export function UsageEmpty({ range }: { range: UsageRangeId }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-hairline bg-paper p-10 text-center">
      <p className="text-sm font-medium text-ink">No usage in the last {rangeLabel(range)}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        Generate a video and this fills with the credits it cost, day by day and model by model.
        Credits are only charged when a run succeeds, and a failed run is refunded automatically.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Create a video
      </Link>
    </div>
  );
}
