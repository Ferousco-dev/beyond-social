"use client";

import { useState, useTransition, type ReactNode } from "react";

import { useConfirm } from "@/components/ui/use-confirm";
import { describeSchedule } from "@/lib/time/zone";

import { cancelScheduledPost, reschedulePost } from "../actions";
import { isMutable, PLATFORM_LABELS, type ScheduledPost } from "../lib/types";
import { PostStatusBadge } from "./post-status-badge";
import { PostThumbnail } from "./post-thumbnail";
import { RescheduleForm } from "./reschedule-form";

const ACTION =
  "min-h-11 rounded-full border border-hairline px-3.5 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

/** One post: what it is, when it goes out, and what can still be done to it. */
export function ScheduledPostCard({
  post,
  timeZone,
}: {
  readonly post: ScheduledPost;
  readonly timeZone: string;
}): ReactNode {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const mutable = isMutable(post);
  const platform = PLATFORM_LABELS[post.platform];

  const handleCancel = (): void => {
    void (async () => {
      const confirmed = await confirm({
        title: `Cancel this ${platform} post?`,
        description:
          "The post is removed from the schedule and will not be published. This cannot be undone, though the video stays in your project.",
        confirmLabel: "Cancel post",
        cancelLabel: "Keep it",
        tone: "destructive",
      });
      if (!confirmed) return;
      setMessage(null);
      startTransition(async () => {
        const result = await cancelScheduledPost(post.id);
        if (result.status === "error") setMessage(result.message);
      });
    })();
  };

  const handleReschedule = (scheduledLocal: string): void => {
    setMessage(null);
    startTransition(async () => {
      const result = await reschedulePost({ id: post.id, scheduledLocal, timeZone });
      if (result.status === "error") setMessage(result.message);
      else setEditing(false);
    });
  };

  return (
    <li className="rounded-xl border border-hairline bg-paper p-4">
      <div className="flex gap-3">
        <PostThumbnail videoUrl={post.videoUrl} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">{platform}</span>
            <PostStatusBadge status={post.status} />
            <span className="text-xs tabular-nums text-ink-soft">
              {describeSchedule(post.scheduledFor, timeZone)}
            </span>
          </div>

          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {post.caption}
            {post.hashtags === "" ? null : <span className="text-ink-soft"> {post.hashtags}</span>}
          </p>

          {post.status === "failed" ? (
            <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
              {post.error ??
                // A failure with no reason is a support ticket, so it ships with
                // the one identifier support can trace rather than a shrug.
                `${platform} did not say why this failed. Quote post ${post.id} to support.`}
            </p>
          ) : null}

          {mutable && post.publishStartedAt !== null ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Publishing had already started when this failed, so it may have reached {platform}.
              Check there before scheduling it again.
            </p>
          ) : null}

          {mutable ? (
            editing ? (
              <RescheduleForm
                scheduledFor={post.scheduledFor}
                timeZone={timeZone}
                pending={pending}
                onSubmit={handleReschedule}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(true)} className={ACTION}>
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pending}
                  className={`${ACTION} hover:border-destructive/40 hover:text-destructive`}
                >
                  Cancel post
                </button>
              </div>
            )
          ) : (
            <p className="mt-3 text-xs text-ink-soft">
              {platform} has this post now, so it can no longer be changed here.
            </p>
          )}

          {message === null ? null : (
            <p role="status" className="mt-2 text-xs text-destructive">
              {message}
            </p>
          )}
        </div>
      </div>
      {dialog}
    </li>
  );
}
