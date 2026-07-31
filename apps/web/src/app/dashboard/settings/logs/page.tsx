import { type Metadata } from "next";
import Link from "next/link";

import { getUserTimeZone } from "@/lib/time/user-zone";

import { LogFilters, logHref } from "./log-filters";
import { LogList } from "./log-list";
import { getLogPage } from "./queries";
import { logFilterSchema, MAX_PAGE, type LogFilter } from "./types";

export const metadata: Metadata = { title: "Activity log" };

const pagerClass =
  "inline-flex min-h-11 items-center rounded-lg border border-hairline px-3.5 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // The query string is user input, so it is parsed rather than trusted. An
  // unparseable filter falls back to the unfiltered view instead of erroring:
  // a hand-edited URL should not be able to break the page.
  const parsed = logFilterSchema.safeParse(raw);
  const filter: LogFilter = parsed.success ? parsed.data : { page: 1 };

  const [{ entries, hasMore, page }, timeZone] = await Promise.all([
    getLogPage(filter),
    getUserTimeZone(),
  ]);

  return (
    <section className="mt-6 lg:mt-8">
      <p className="text-sm text-ink-soft">
        What the platform has done on your behalf: videos, posts, AI calls, and API keys. Times are
        shown in your timezone ({timeZone}).
      </p>

      <div className="mt-6">
        <LogFilters filter={filter} />
      </div>

      <div className="mt-4">
        <LogList entries={entries} timeZone={timeZone} />
      </div>

      {page > 1 || hasMore ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={logHref({ ...filter, page: page - 1 })} className={pagerClass} rel="prev">
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-ink-soft">Page {page}</span>
          {hasMore && page < MAX_PAGE ? (
            <Link href={logHref({ ...filter, page: page + 1 })} className={pagerClass} rel="next">
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      {hasMore && page >= MAX_PAGE ? (
        <p className="mt-3 text-xs text-ink-soft">
          This is as far back as the log pages. Filter by day to reach older activity.
        </p>
      ) : null}
    </section>
  );
}
