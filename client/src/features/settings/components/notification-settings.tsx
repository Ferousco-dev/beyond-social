"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useEmailWhenReady } from "../preferences";

/** One setting per row: what it does on the left, the switch on the right. */
function SwitchRow({ title, body, on, onChange }: { title: string; body: string; on: boolean; onChange: (on: boolean) => void }): ReactNode {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{body}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={() => onChange(!on)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          on ? "bg-primary" : "bg-hairline",
        )}
      >
        <span className={cn("inline-block size-4 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

export function NotificationSettings(): ReactNode {
  const [emailWhenReady, setEmailWhenReady] = useEmailWhenReady();
  return (
    <div className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
      <SwitchRow
        title="Email me when a video is ready"
        body="We send one email when each video finishes."
        on={emailWhenReady}
        onChange={setEmailWhenReady}
      />
    </div>
  );
}
