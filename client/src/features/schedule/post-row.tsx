"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { type ScheduledPost } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { cancelPost } from "./actions";

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

export function PostRow({
  post,
  compact = false,
}: {
  readonly post: ScheduledPost;
  readonly compact?: boolean;
}): ReactNode {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const status = STATUS[post.status];
  const cancellable = post.status === "preparing" || post.status === "scheduled";

  const cancel = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await cancelPost(post.id);
      if (!result.ok) setError(result.message);
      else router.refresh();
    });

  const content = (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", compact ? "pt-2" : "p-4")}>
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
        {cancellable ? (
          <Button variant="outline" disabled={pending} onClick={() => setConfirmOpen(true)}>
            Cancel
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        options={{
          title: "Cancel this post?",
          description: "The scheduled post will not be published. This cannot be undone.",
          confirmLabel: pending ? "Cancelling…" : "Cancel post",
          cancelLabel: "Keep post",
        }}
        onResolve={(confirmed) => {
          setConfirmOpen(false);
          if (confirmed) cancel();
        }}
      />
    </div>
  );

  return compact ? content : <li className="border-b border-hairline last:border-b-0">{content}</li>;
}
