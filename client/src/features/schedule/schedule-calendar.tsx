"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type ScheduledPost } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { PostRow } from "./post-row";

const STATUS: Readonly<Record<ScheduledPost["status"], { label: string; tone: string }>> = {
  preparing: { label: "Preparing", tone: "bg-cloud text-ink-soft" },
  scheduled: { label: "Scheduled", tone: "bg-info/10 text-info" },
  publishing: { label: "Publishing", tone: "bg-info/10 text-info" },
  published: { label: "Published", tone: "bg-success/10 text-success" },
  failed: { label: "Failed", tone: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", tone: "bg-cloud text-ink-soft" },
};

const PLATFORM: Readonly<Record<ScheduledPost["platform"], string>> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthCells(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ScheduleCalendar({
  posts,
}: {
  readonly posts: readonly ScheduledPost[];
}): ReactNode {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const cells = useMemo(() => monthCells(month), [month]);
  const byDate = useMemo(() => {
    const grouped = new Map<string, ScheduledPost[]>();
    for (const post of posts) {
      const date = new Date(post.scheduled_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = dateKey(date);
      const current = grouped.get(key) ?? [];
      current.push(post);
      grouped.set(key, current);
    }
    for (const dayPosts of grouped.values()) {
      dayPosts.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    }
    return grouped;
  }, [posts]);
  const selectedPosts = byDate.get(selectedDate) ?? [];
  const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <section aria-label={`${monthName} schedule`} className="min-w-0 rounded-2xl border border-hairline bg-paper p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{monthName}</h2>
            <p className="text-xs text-ink-soft">{posts.length} posts loaded</p>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-hairline pb-2">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-ink-soft sm:text-xs">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date) => {
            const key = dateKey(date);
            const dayPosts = byDate.get(key) ?? [];
            const insideMonth = date.getMonth() === month.getMonth();
            const selected = key === selectedDate;
            const hasFailure = dayPosts.some((post) => post.status === "failed");
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                aria-label={`${date.toLocaleDateString(undefined, { dateStyle: "full" })}${dayPosts.length ? `, ${dayPosts.length} posts` : ""}`}
                aria-pressed={selected}
                className={cn(
                  "flex min-h-17 flex-col items-center border-b border-r border-hairline p-1.5 text-sm transition-colors last:border-r-0 hover:bg-cloud/60 sm:min-h-21 sm:p-2",
                  !insideMonth && "text-ink-soft/50",
                  selected && "bg-primary/5 ring-1 ring-inset ring-primary",
                )}
              >
                <span className={cn("inline-flex size-7 items-center justify-center rounded-full text-xs tabular-nums", dateKey(new Date()) === key && "bg-ink text-canvas")}>
                  {date.getDate()}
                </span>
                {dayPosts.length > 0 ? (
                  <span className="mt-1 flex items-center gap-1" aria-hidden>
                    {hasFailure ? <span className="size-1.5 rounded-full bg-destructive" /> : null}
                    <span className="size-1.5 rounded-full bg-primary" />
                    {dayPosts.length > 1 ? <span className="text-[9px] text-ink-soft">{dayPosts.length}</span> : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-ink-soft">
          {(["scheduled", "publishing", "published", "failed"] as const).map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", status === "failed" ? "bg-destructive" : status === "published" ? "bg-success" : "bg-primary")} aria-hidden />
              {STATUS[status].label}
            </span>
          ))}
        </div>
      </section>

      <section aria-live="polite" aria-label={`Posts on ${selectedDate}`} className="min-w-0">
        <h2 className="text-base font-semibold text-ink">
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { dateStyle: "full" })}
        </h2>
        {selectedPosts.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-hairline p-4 text-sm text-ink-soft">
            No posts on this day.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-paper">
            {selectedPosts.map((post) => (
              <li key={post.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-ink">{PLATFORM[post.platform]}</span>
                    <span className={cn("ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS[post.status].tone)}>
                      {STATUS[post.status].label}
                    </span>
                    <p className="mt-1 truncate text-sm text-ink">{post.title || post.caption || "Untitled video"}</p>
                    <p className="mt-1 text-xs text-ink-soft">{dateLabel(post.scheduled_at)}</p>
                  </div>
                  {post.external_url ? (
                    <a
                      href={post.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View published ${PLATFORM[post.platform]} video`}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                    </a>
                  ) : null}
                </div>
                <div className="mt-2">
                  <PostRow post={post} compact />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
