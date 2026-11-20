"use client";

import { ArrowRight, Sparkles, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { type TutorialStep, type TutorialTrackId } from "./steps";
import { useTutorial } from "./use-tutorial";

interface Box {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

const CARD_W = 304;
const CARD_EST_H = 188;
const MARGIN = 12;

function measure(anchor: string): Box | null {
  const el = document.querySelector(`[data-tip-anchor="${anchor}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function positionCard(box: Box, preferred: TutorialStep["placement"] = "bottom"): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_W, vw - MARGIN * 2);

  let top = box.top + box.height + MARGIN;
  let left = box.left;

  if (preferred === "right" && box.left + box.width + MARGIN + width <= vw - MARGIN) {
    left = box.left + box.width + MARGIN;
    top = box.top;
  } else if (preferred === "left" && box.left - MARGIN - width >= MARGIN) {
    left = box.left - MARGIN - width;
    top = box.top;
  } else if (preferred === "top" && box.top - MARGIN - CARD_EST_H >= MARGIN) {
    top = box.top - MARGIN - CARD_EST_H;
    left = box.left + box.width / 2 - width / 2;
  } else if (box.top + box.height + MARGIN + CARD_EST_H <= vh - MARGIN) {
    top = box.top + box.height + MARGIN;
    left = box.left + box.width / 2 - width / 2;
  } else {
    top = Math.max(MARGIN, box.top - MARGIN - CARD_EST_H);
    left = box.left + box.width / 2 - width / 2;
  }

  return {
    top: Math.max(MARGIN, Math.min(vh - CARD_EST_H - MARGIN, top)),
    left: Math.max(MARGIN, Math.min(vw - width - MARGIN, left)),
    width,
  };
}

/**
 * Non-blocking, game-style contextual spotlight + coach card.
 * Keeps the highlighted control clickable so new users learn by doing.
 */
export function TutorialOverlay({ track }: { track: TutorialTrackId }): ReactNode {
  const { step, index, total, next, back, dismiss } = useTutorial(track);
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!step) {
      setBox(null);
      return;
    }
    const update = (): void => setBox(measure(step.anchor));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const interval = window.setInterval(update, 400);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(interval);
    };
  }, [step]);

  if (!step || !box || typeof document === "undefined") return null;

  const isLast = index === total - 1;
  const cardStyle = positionCard(box, step.placement);

  return createPortal(
    <>
      {/* Pulsing spotlight frame around the real interactive element (never blocks clicks). */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-[60] rounded-xl ring-2 ring-primary transition-all duration-200 motion-reduce:transition-none"
        style={{
          top: box.top - 4,
          left: box.left - 4,
          width: box.width + 8,
          height: box.height + 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.42)",
        }}
      >
        <span className="absolute -right-1.5 -top-1.5 flex size-3.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-3.5 rounded-full bg-primary" />
        </span>
      </div>

      {/* Floating contextual coach card */}
      <aside
        role="dialog"
        aria-label={`Quick tip ${index + 1} of ${total}: ${step.title}`}
        style={cardStyle}
        className="fixed z-[61] rounded-xl border border-primary/40 bg-paper p-4 text-ink shadow-xl transition-all duration-200 motion-reduce:transition-none"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="size-3" aria-hidden />
            Tip {index + 1} of {total}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tutorial"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

        <h3 className="mt-2.5 text-sm font-semibold text-ink">{step.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{step.body}</p>

        {step.actionHint ? (
          <p className="mt-2 text-[11px] font-medium text-primary">{step.actionHint}</p>
        ) : null}

        <div className="mt-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={i === index ? "h-1.5 w-4 rounded-full bg-primary transition-all" : "size-1.5 rounded-full bg-hairline"}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {index > 0 ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium text-ink-soft hover:bg-cloud hover:text-ink"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium text-ink-soft hover:bg-cloud hover:text-ink"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isLast ? "Got it" : "Next"}
              {!isLast ? <ArrowRight className="size-3.5" aria-hidden /> : null}
            </button>
          </div>
        </div>
      </aside>
    </>,
    document.body,
  );
}
