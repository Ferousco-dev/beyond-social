import Link from "next/link";
import { type Route } from "next";

const RANGES = [7, 30, 90] as const;

/** Same 7/30/90 window tabs as AnalyticsRangeTabs, generalized to any base
 * path so the user detail page's spend chart can use them too. */
export function DayRangeTabs({
  basePath,
  active,
}: {
  readonly basePath: string;
  readonly active: number;
}) {
  return (
    <nav aria-label="Date window" className="flex gap-1.5">
      {RANGES.map((days) => (
        <Link
          key={days}
          href={`${basePath}?days=${days}` as Route}
          aria-current={days === active ? "page" : undefined}
          className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            days === active
              ? "border-transparent bg-ink text-canvas"
              : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
          }`}
        >
          {days}d
        </Link>
      ))}
    </nav>
  );
}
