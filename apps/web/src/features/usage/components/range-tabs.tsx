import Link from "next/link";

import { USAGE_RANGES, type UsageRangeId } from "../lib/range";

/**
 * Links, not buttons. The range is in the URL, so a chosen range can be
 * bookmarked and shared, and the page keeps working before any script loads.
 */
export function RangeTabs({ active }: { active: UsageRangeId }) {
  return (
    <nav aria-label="Date range" className="flex flex-wrap gap-1.5">
      {USAGE_RANGES.map((range) => {
        const current = range.id === active;
        return (
          <Link
            key={range.id}
            href={`/dashboard/settings/usage?range=${range.id}`}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              current
                ? "border-transparent bg-ink text-canvas"
                : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
            }`}
          >
            Last {range.label}
          </Link>
        );
      })}
    </nav>
  );
}
