"use client";

import { useCallback, type RefObject } from "react";

import { useStudio } from "../../store/editor-store";

/** Shift-drag on the ruler marks the part of the video the assistant should change. */
export function useRangeMark(
  content: RefObject<HTMLDivElement | null>,
): (clientX: number) => void {
  return useCallback(
    (clientX: number): void => {
      const box = content.current?.getBoundingClientRect();
      if (!box) return;
      const at = (x: number): number =>
        Math.max(0, (x - box.left) / useStudio.getState().zoom);
      const anchor = at(clientX);
      const move = (e: PointerEvent): void => {
        const here = at(e.clientX);
        useStudio
          .getState()
          .setRange({
            start: Math.min(anchor, here),
            end: Math.max(anchor, here),
          });
      };
      const stop = (): void => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [content],
  );
}
