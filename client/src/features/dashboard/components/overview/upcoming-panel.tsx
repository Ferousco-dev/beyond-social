import { CalendarClock } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

import { describeSchedule } from "@/lib/time/zone";

import { Panel, PanelEmpty, PanelList, PanelMore, PanelRow } from "./panel";
import { platformLabel, type Capped, type UpcomingPost } from "./types";

/** A post has no detail page, so rows lead to the queue that manages them. */
const SCHEDULE = "/dashboard/schedule" as Route;

const ROW =
  "flex min-h-11 flex-col justify-center gap-0.5 px-4 py-2.5 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/** What goes out next, in the reader's own timezone. */
export function UpcomingPanel({
  upcoming,
  timeZone,
}: {
  readonly upcoming: Capped<UpcomingPost>;
  readonly timeZone: string;
}) {
  return (
    <Panel title="Next up" meta={upcoming.total === 0 ? "None" : `${upcoming.total} scheduled`}>
      {upcoming.items.length === 0 ? (
        <PanelEmpty icon={CalendarClock}>
          Nothing scheduled. Posts you schedule appear here with their publish time.
        </PanelEmpty>
      ) : (
        <>
          <PanelList>
            {upcoming.items.map((post) => (
              <PanelRow key={post.id}>
                <Link href={SCHEDULE} className={ROW}>
                  <span className="truncate text-sm text-ink">{post.caption}</span>
                  <span className="truncate text-xs text-ink-soft">
                    {platformLabel(post.platform)}
                    {post.status === "publishing" ? ", publishing now" : ""},{" "}
                    <time dateTime={post.scheduledFor}>
                      {describeSchedule(post.scheduledFor, timeZone)}
                    </time>
                  </span>
                </Link>
              </PanelRow>
            ))}
          </PanelList>
          <PanelMore hidden={upcoming.total - upcoming.items.length} />
        </>
      )}
    </Panel>
  );
}
