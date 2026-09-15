"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { type StuckWorkItem } from "@/lib/dashboard/admin";
import { retryPost } from "../actions/debug";

export function StuckWorkList({ items }: { readonly items: StuckWorkItem[] }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">No stuck work right now.</p>;
  }

  async function handleRetry(item: StuckWorkItem) {
    const confirmed = await confirm({
      title: "Retry this post?",
      description:
        "Re-queues the post for the scheduler. The publish worker still refuses any post that already reached the platform, so this is safe to use even when unsure.",
      confirmLabel: "Retry",
    });
    if (!confirmed) return;

    startTransition(() => {
      void retryPost({ postId: item.id, reason: "Requeued from the debugging console" }).then(() =>
        router.refresh(),
      );
    });
  }

  return (
    <div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="rounded-lg bg-cloud px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">
                {item.kind} · {item.detail} · {item.status}
                {item.alreadyPosted && (
                  <span className="ml-2 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                    may have posted
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-ink-soft">{new Date(item.since).toLocaleString()}</span>
                {item.kind === "publish" && item.retryable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => void handleRetry(item)}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {dialog}
    </div>
  );
}
