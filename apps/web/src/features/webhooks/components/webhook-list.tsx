"use client";

import { useState, useTransition } from "react";

import { type WebhookSummary } from "@/lib/webhooks/types";

export interface WebhookListProps {
  webhooks: readonly WebhookSummary[];
  onRotate: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const actionClass =
  "min-h-11 shrink-0 rounded-full border border-hairline px-3 text-xs text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

/** The registered endpoints, with the controls that act on one. */
export function WebhookList({ webhooks, onRotate, onToggle, onDelete }: WebhookListProps) {
  const [pending, startTransition] = useTransition();
  // Deleting discards the secret irrecoverably, so it takes two clicks. Scoped
  // to one row so arming one endpoint cannot arm another.
  const [confirming, setConfirming] = useState<string | null>(null);

  if (webhooks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline bg-paper p-10 text-center">
        <p className="text-sm font-medium text-ink">No endpoints yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          Add one to receive a signed request whenever a video finishes or a post goes live.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {webhooks.map((webhook) => (
        <li key={webhook.id} className="rounded-xl border border-hairline bg-paper p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className="truncate">{webhook.url}</span>
                {webhook.isActive ? null : (
                  <span className="shrink-0 rounded-full bg-cloud px-2 py-0.5 text-[11px] font-normal text-ink-soft">
                    Paused
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Secret ending <code className="text-ink">{webhook.secretLastFour}</code>
                {webhook.failureCount > 0 ? ` · ${webhook.failureCount} failed deliveries` : ""}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {webhook.events.map((event) => (
                  <li
                    key={event}
                    className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink-soft"
                  >
                    {event}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => onRotate(webhook.id))}
                className={actionClass}
              >
                Rotate secret
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => onToggle(webhook.id, !webhook.isActive))}
                className={actionClass}
              >
                {webhook.isActive ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirming !== webhook.id) {
                    setConfirming(webhook.id);
                    return;
                  }
                  setConfirming(null);
                  startTransition(() => onDelete(webhook.id));
                }}
                onBlur={() => setConfirming((id) => (id === webhook.id ? null : id))}
                className={`${actionClass} hover:border-destructive/40 hover:text-destructive ${
                  confirming === webhook.id ? "border-destructive/40 text-destructive" : ""
                }`}
              >
                {confirming === webhook.id ? "Confirm delete" : "Delete"}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
