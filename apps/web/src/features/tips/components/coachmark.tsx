"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { type Tip } from "@/lib/tips/tips";
import { cn } from "@/lib/utils";

import { useSeenTips } from "../hooks/use-seen-tips";

/**
 * A small pointer at a control somebody has not found.
 *
 * Positioned from the anchor's own rectangle rather than by wrapping it, so the
 * element being pointed at needs nothing but a `data-tip-anchor`. Wrapping would
 * have meant every anchor becoming a relative container, which changes layouts
 * that were fine.
 *
 * It never covers what it points at, it can always be dismissed, and it goes
 * away for good once it has been. A tip that comes back is an advert.
 */

/** Gap between the card and the control, leaving room for the arrow. */
const OFFSET = 12;

/** Kept off the viewport edges on narrow screens. */
const MARGIN = 12;

const CARD_WIDTH = 260;

interface Position {
  readonly top: number;
  readonly left: number;
  /** Where the arrow sits along the card, so it points at the control's centre. */
  readonly arrow: number;
}

export function Coachmark({ tip, when = true }: { tip: Tip; when?: boolean }) {
  const { ready, seen, dismiss } = useSeenTips();
  const [position, setPosition] = useState<Position | null>(null);

  const active = ready && when && !seen.has(tip.id);

  useEffect(() => {
    if (!active) {
      setPosition(null);
      return;
    }

    const place = () => {
      const anchor = document.querySelector(`[data-tip-anchor="${tip.anchor}"]`);
      if (!anchor) {
        // The control is not on this screen. Showing the card anyway would put
        // an arrow against nothing, so it simply does not appear.
        setPosition(null);
        return;
      }

      const box = anchor.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) {
        setPosition(null);
        return;
      }

      if (tip.side === "right") {
        setPosition({
          top: Math.max(MARGIN, box.top + box.height / 2 - 40),
          left: box.right + OFFSET,
          arrow: 28,
        });
        return;
      }

      // Centred over the control, then pulled back inside the viewport. The
      // arrow keeps its position against the control rather than the card, so
      // clamping the card does not leave it pointing somewhere else.
      const wanted = box.left + box.width / 2 - CARD_WIDTH / 2;
      const left = Math.min(
        Math.max(MARGIN, wanted),
        Math.max(MARGIN, window.innerWidth - CARD_WIDTH - MARGIN),
      );

      setPosition({
        top: box.top - OFFSET,
        left,
        arrow: box.left + box.width / 2 - left,
      });
    };

    place();

    // Anything that moves the control moves the card with it. `true` for the
    // capture phase so scrolling inside a pane counts, not just the window.
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [active, tip.anchor, tip.side]);

  if (!active || !position) return null;

  const onTop = tip.side === "top";

  return (
    <div
      role="note"
      aria-label={tip.title}
      style={{
        top: position.top,
        left: position.left,
        width: CARD_WIDTH,
        // Translated rather than measured: the card's height is not known until
        // it has rendered, and reading it back would cost a second paint.
        transform: onTop ? "translateY(-100%)" : undefined,
      }}
      className="fixed z-50 rounded-xl bg-primary p-3.5 text-primary-foreground shadow-card"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{tip.title}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{tip.body}</p>
        </div>

        <button
          type="button"
          onClick={() => dismiss(tip.id)}
          aria-label={`Dismiss: ${tip.title}`}
          className="-mr-1 -mt-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary-foreground/80 transition-colors hover:bg-black/10 hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* A rotated square rather than a border triangle, so it inherits the
          card's own colour and stays correct in both themes. */}
      <span
        aria-hidden
        style={
          onTop
            ? { left: Math.min(Math.max(14, position.arrow), CARD_WIDTH - 14) }
            : { top: position.arrow }
        }
        className={cn(
          "absolute size-2.5 rotate-45 bg-primary",
          onTop ? "-bottom-1 -translate-x-1/2" : "-left-1 -translate-y-1/2",
        )}
      />
    </div>
  );
}
