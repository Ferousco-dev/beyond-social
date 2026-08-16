"use client";

import { CornerDownLeft, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The control that sends a brief.
 *
 * It was a black circle with an arrow pointing up, which is the assistant
 * convention every chat product shipped in the same year, and this product is
 * not trying to look like a chat product. What it is is a piece of software you
 * type an instruction into, so the button says what pressing it does and shows
 * the key that does the same thing.
 *
 * The glyph is the return arrow rather than a direction of travel. It names the
 * shortcut instead of miming an upload, which is the more useful of the two
 * things an icon here could say. On a narrow screen the label goes and the
 * glyph carries it alone, which is why the accessible name never comes from the
 * label.
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
        "group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-ink font-medium text-paper transition-[opacity,transform] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none motion-reduce:active:scale-100",
        size === "compact" ? "h-7 px-2.5 text-xs" : "h-9 px-3 text-sm",
      )}
    >
      {busy ? (
        <Loader2
          className={cn("animate-spin", size === "compact" ? "size-3" : "size-3.5")}
          aria-hidden
        />
      ) : (
        <CornerDownLeft
          className={cn(
            // Nudges on hover in the direction the key sends it. One pixel of
            // acknowledgement, not an animation.
            "transition-transform group-hover:translate-x-px motion-reduce:transition-none motion-reduce:group-hover:translate-x-0",
            size === "compact" ? "size-3" : "size-3.5",
          )}
          aria-hidden
        />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
