"use client";

import {
  Calendar,
  CalendarClock,
  Camera,
  CheckCircle,
  Clock,
  MessageCircle,
  Music,
  Play,
  XCircle,
} from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { PLATFORMS, SCHEDULED_POSTS } from "@/lib/publish/data";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  tiktok: Music,
  instagram: Camera,
  facebook: MessageCircle,
  youtube: Play,
};

export function ScheduledPosts({ onNavigate }: { onNavigate?: () => void }) {
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
        <div className="flex flex-col gap-2">
          {SCHEDULED_POSTS.map((post) => {
            const statusIcon =
              post.status === "published" ? (
                <CheckCircle className="size-4 text-success" />
              ) : post.status === "failed" ? (
                <XCircle className="size-4 text-destructive" />
              ) : (
                <Clock className="size-4 text-warning" />
              );

            return (
              <div
                key={post.id}
                className="flex items-center gap-4 rounded-xl border border-hairline bg-paper px-4 py-3 transition-colors hover:bg-cloud"
              >
                <div className="flex shrink-0 items-center gap-2">
                  {statusIcon}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      post.status === "published"
                        ? "text-success"
                        : post.status === "failed"
                          ? "text-destructive"
                          : "text-warning",
                    )}
                  >
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
                        const Icon = PLATFORM_ICONS[platformId];
                        const platform = PLATFORMS.find((p) => p.id === platformId);
                        return Icon ? (
                          <div
                            key={platformId}
                            className="flex size-5 items-center justify-center rounded-md"
                            style={{ backgroundColor: platform?.color }}
                            title={platform?.name}
                          >
                            <Icon className="size-3 text-white" />
                          </div>
                        ) : null;
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
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
