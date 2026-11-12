"use client";

import { X } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";

const KEY = "bs:new-video-hint-dismissed";

function subscribe(): () => void {
  return () => undefined;
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * One line of guidance for someone new: where to start and that nothing is
 * charged without a quote. Dismissed for good the first time it is closed or
 * a starting point is chosen. Kept on this device, so it returns on a new one.
 */
export function FirstRunHint({ hidden }: { hidden: boolean }): ReactNode {
  const dismissedBefore = useSyncExternalStore(subscribe, wasDismissed, () => true);
  const [closed, setClosed] = useState(false);
  if (dismissedBefore || closed || hidden) return null;

  function close(): void {
    setClosed(true);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // The hint simply shows again next time.
    }
  }

  return (
    <div role="note" className="mt-5 flex items-start gap-3 rounded-xl border border-hairline bg-cloud/50 p-4 text-sm text-ink-soft">
      <p className="min-w-0 flex-1 leading-relaxed">
        <span className="font-medium text-ink">New here?</span> Start with <span className="font-medium text-ink">Find trending videos</span> to
        build on something that already works, or <span className="font-medium text-ink">Start with my own idea</span> if you know what to make.
        You see the credit cost before anything is charged.
      </p>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss this tip"
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary pointer-coarse:size-11"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
