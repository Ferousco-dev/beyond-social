"use client";

import { Calendar, CalendarClock, CheckCircle, Clock, MoreHorizontal, XCircle } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PLATFORMS, SCHEDULED_POSTS, type ScheduledPost } from "@/lib/publish/data";
import { cn } from "@/lib/utils";

const STATUS: Record<ScheduledPost["status"], { icon: ReactNode; className: string }> = {
  published: { icon: <CheckCircle className="size-4 text-success" />, className: "text-success" },
  failed: { icon: <XCircle className="size-4 text-destructive" />, className: "text-destructive" },
  pending: { icon: <Clock className="size-4 text-warning" />, className: "text-warning" },
};

export function ScheduledPosts({ onNavigate }: { onNavigate?: () => void }): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Scheduled posts</h2>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
        >
          <CalendarClock className="size-4" />
          Calendar view
        </button>
      </div>

      {SCHEDULED_POSTS.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-cloud py-12">
          <Calendar className="size-8 text-ink-soft" />
          <p className="mt-3 text-sm font-medium text-ink">No scheduled posts</p>
          <p className="mt-1 text-sm text-ink-soft">Videos you schedule will appear here</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {SCHEDULED_POSTS.map((post) => {
            const status = STATUS[post.status];
            return (
              <li
                key={post.id}
                className="flex items-center gap-4 rounded-xl border border-hairline bg-paper px-4 py-3 transition-colors hover:bg-cloud"
              >
                <div className="flex shrink-0 items-center gap-2">
                  {status.icon}
                  <span className={cn("text-xs font-medium capitalize", status.className)}>
                    {post.status}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/editor/${post.id}` as Route}
                    onClick={onNavigate}
                    className="block truncate text-sm font-medium text-ink transition-colors hover:text-primary"
                  >
                    {post.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {post.platforms.map((platformId) => {
                        const platform = PLATFORMS.find((entry) => entry.id === platformId);
                        if (!platform) return null;
                        return (
                          <span
                            key={platformId}
                            title={platform.name}
                            style={{ backgroundColor: platform.color }}
                            className="flex size-5 items-center justify-center rounded-md"
                          >
                            <platform.icon className="size-3 text-white" />
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-xs text-ink-soft">{post.scheduledFor}</span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="More options"
                  className="shrink-0 cursor-pointer rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
