import { type ReactNode } from "react";

import { type ScheduleBoard as Board } from "../lib/queries";
import { type ScheduledPost } from "../lib/types";
import { ScheduleEmpty } from "./schedule-empty";
import { ScheduledPostCard } from "./scheduled-post-card";

/**
 * The whole schedule, in the order the questions get asked: what is going out,
 * what went out, and what did not. Empty sections are omitted rather than
 * shown empty, so a healthy account is not a page of "none".
 */
export function ScheduleBoard({
  board,
  timeZone,
}: {
  readonly board: Board;
  readonly timeZone: string;
}): ReactNode {
  const total = board.upcoming.length + board.published.length + board.failed.length;
  if (total === 0) return <ScheduleEmpty />;

  return (
    <div className="space-y-8">
      <Section title="Upcoming" posts={board.upcoming} timeZone={timeZone} />
      <Section title="Published" posts={board.published} timeZone={timeZone} />
      <Section title="Failed" posts={board.failed} timeZone={timeZone} />
    </div>
  );
}

function Section({
  title,
  posts,
  timeZone,
}: {
  readonly title: string;
  readonly posts: readonly ScheduledPost[];
  readonly timeZone: string;
}): ReactNode {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby={`schedule-${title.toLowerCase()}`}>
      <h2 id={`schedule-${title.toLowerCase()}`} className="text-sm font-semibold text-ink">
        {title}
        <span className="ml-2 text-xs font-normal tabular-nums text-ink-soft">{posts.length}</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {posts.map((post) => (
          <ScheduledPostCard key={post.id} post={post} timeZone={timeZone} />
        ))}
      </ul>
    </section>
  );
}
