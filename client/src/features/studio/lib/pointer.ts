import { type PointerEvent as ReactPointerEvent } from "react";

/**
 * Follows a pointer drag from where it started. `onStart` runs once on the
 * first real movement, so a plain click never counts as a drag.
 */
export function trackPointer(
  event: ReactPointerEvent<HTMLElement>,
  onMove: (deltaX: number) => void,
  onStart?: () => void,
  onEnd?: () => void,
): void {
  const originX = event.clientX;
  let started = false;
  const move = (e: PointerEvent): void => {
    const dx = e.clientX - originX;
    if (!started) {
      if (Math.abs(dx) < 3) return;
      started = true;
      onStart?.();
    }
    onMove(dx);
  };
  const stop = (): void => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    if (started) onEnd?.();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}
