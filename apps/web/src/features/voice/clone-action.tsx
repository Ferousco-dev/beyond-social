"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { useConfirm } from "@/components/ui/use-confirm";
import { Spinner } from "@/components/ui/spinner";

import { startVoiceClone, type CloneStatus } from "./clone-actions";

const BADGE: Record<CloneStatus, { label: string; className: string } | null> = {
  none: null,
  pending: { label: "Cloning…", className: "bg-cloud text-ink-soft" },
  ready: { label: "Cloned", className: "bg-success/10 text-success" },
  failed: { label: "Clone failed", className: "bg-destructive/10 text-destructive" },
};

/**
 * Turns an enrolled clip into a reusable, typeable voice.
 *
 * Kept out of `EnrollCard` to hold that file under the repo's 200-line limit
 * rather than for any separation of concern beyond that: this is still just
 * the enrolled-voice card's footer.
 */
export function VoiceCloneAction({ status, error }: { status: CloneStatus; error: string | null }) {
  const [cloneStatus, setCloneStatus] = useState(status);
  const [cloneError, setCloneError] = useState(error);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const badge = BADGE[cloneStatus];
  const canClone = cloneStatus === "none" || cloneStatus === "failed";

  async function handleClone() {
    const agreed = await confirm({
      title: "Clone this voice?",
      description:
        "Sends your saved clip to the speech provider so it can say anything you type. This costs credits and cannot be undone by itself; re-recording later invalidates the clone.",
      confirmLabel: "Clone it",
    });
    if (!agreed) return;

    startTransition(async () => {
      const result = await startVoiceClone();
      if (result.status === "ok") {
        setCloneStatus(result.cloneStatus);
        setCloneError(null);
      } else if (result.status === "failed") {
        setCloneStatus("failed");
        setCloneError(result.message);
      } else if (result.status === "error") {
        setCloneError(result.message);
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {dialog}
      {badge ? (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      ) : null}
      {canClone ? (
        <button
          type="button"
          onClick={() => void handleClone()}
          disabled={pending}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-50"
        >
          {pending ? <Spinner className="size-3.5" /> : <Sparkles className="size-3.5" />}
          Clone this voice
        </button>
      ) : null}
      {cloneStatus === "ready" ? (
        <span className="text-xs text-ink-soft">Type what you want said in the chat composer.</span>
      ) : null}
      {cloneError ? <span className="text-xs text-destructive">{cloneError}</span> : null}
    </div>
  );
}
