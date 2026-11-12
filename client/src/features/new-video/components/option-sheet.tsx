"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { useMediaQuery } from "@/features/studio/hooks/use-media-query";
import { cn } from "@/lib/utils";

const DISMISS_DISTANCE = 120;

/**
 * Where a starting point's questions live. A centred modal on desktop; on a
 * phone a bottom sheet that is dragged down to close.
 */
export function OptionSheet({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}): ReactNode {
  const desktop = useMediaQuery("(min-width: 640px)");
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  function down(event: ReactPointerEvent<HTMLDivElement>): void {
    startY.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragging) setOffset(Math.max(0, event.clientY - startY.current));
  }
  function up(): void {
    setDragging(false);
    if (offset > DISMISS_DISTANCE) onClose();
    setOffset(0);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          style={desktop ? undefined : { transform: `translateY(${offset}px)`, transition: dragging ? "none" : "transform 200ms ease" }}
          className={cn(
            "fixed z-50 flex flex-col border border-hairline bg-paper text-ink shadow-2xl focus:outline-none",
            desktop
              ? "left-1/2 top-1/2 max-h-[85vh] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
              : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          )}
        >
          {desktop ? null : (
            <div
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3"
              aria-hidden
            >
              <span className="h-1.5 w-10 rounded-full bg-hairline" />
            </div>
          )}
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 sm:px-6 sm:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-ink">{title}</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-soft">{description}</Dialog.Description>
            </div>
            {desktop ? (
              <Dialog.Close asChild>
                <button type="button" aria-label="Close" className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                  <X className="size-4" aria-hidden />
                </button>
              </Dialog.Close>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
