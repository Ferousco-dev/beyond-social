"use client";

import { ExternalLink } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type ScheduledPost } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { cancelPost, reschedulePost } from "./actions";

const STATUS: Readonly<Record<ScheduledPost["status"], { label: string; tone: string }>> = {
  preparing: { label: "Getting ready", tone: "text-ink-soft" },
  scheduled: { label: "Scheduled", tone: "text-info" },
  publishing: { label: "Posting now", tone: "text-info" },
  published: { label: "Posted", tone: "text-success" },
  failed: { label: "Failed", tone: "text-destructive" },
  cancelled: { label: "Cancelled", tone: "text-ink-soft" },
};

const PLATFORM: Readonly<Record<ScheduledPost["platform"], string>> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export function PostRow({ post }: { readonly post: ScheduledPost }): ReactNode {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");
  const status = STATUS[post.status];
  const movable = post.status === "preparing" || post.status === "scheduled";
  const cancellable = movable;

  const cancel = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await cancelPost(post.id);
      if (!result.ok) setError(result.message);
    });

  const reschedule = (): void => {
    if (when === "") return;
    startTransition(async () => {
      setError(null);
      const result = await reschedulePost(post.id, when);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditing(false);
    });
  };

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">
          {PLATFORM[post.platform]}
          <span className={cn("ml-2 text-xs font-normal", status.tone)}>{status.label}</span>
        </p>
        <p className="mt-0.5 truncate text-sm text-ink-soft">{post.title || post.caption || "Untitled video"}</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          <time dateTime={post.scheduled_at}>
            {new Date(post.scheduled_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </time>
        </p>
        {post.status === "failed" && post.error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {post.error}
          </p>
        ) : null}
        {editing ? (
          <span className="mt-2 flex items-center gap-2">
            <input
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              aria-label="New date and time"
              className="h-9 rounded-lg border border-hairline bg-paper px-2 text-xs text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary"
            />
            <Button variant="outline" disabled={pending || when === ""} onClick={reschedule}>
              Move
            </Button>
          </span>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        {post.external_url ? (
          <a
            href={post.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-input px-4 text-sm font-medium text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
        {movable && !editing ? (
          <Button variant="outline" disabled={pending} onClick={() => setEditing(true)}>
            Reschedule
          </Button>
        ) : null}
        {cancellable ? (
          <Button variant="outline" disabled={pending} onClick={cancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </li>
  );
}
