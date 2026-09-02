"use client";

import { ArrowUp } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/**
 * The control that sends a brief: a filled circle with an arrow.
 *
 * One component rather than the copy in the composer and the copy in the editor,
 * which had drifted to different sizes and different disabled opacities while
 * being the same control.
 *
 * The circle is 44px on a touch screen, where the visual size would otherwise be
 * under what a thumb can reliably land on. That is the only thing here that
 * changes with the pointer.
 */
export function SendButton({
  onClick,
  disabled = false,
  busy = false,
  label = "Send",
  /** The full sentence for assistive tech and the tooltip, e.g. why it is disabled. */
  hint,
  size = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  /** Work in flight that has to finish before this can be pressed. */
  busy?: boolean;
  label?: string;
  hint?: string;
  size?: "default" | "compact";
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={hint ?? label}
      title={hint ?? label}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-[opacity,transform] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none motion-reduce:active:scale-100",
        "pointer-coarse:size-11",
        size === "compact" ? "size-7" : "size-9",
      )}
    >
      {busy ? (
        <Spinner className={cn(size === "compact" ? "size-3.5" : "size-4")} />
      ) : (
        <ArrowUp className={cn(size === "compact" ? "size-3.5" : "size-4")} aria-hidden />
      )}
    </button>
  );
}
