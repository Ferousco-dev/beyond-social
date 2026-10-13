"use client";

import { useEffect } from "react";

import { endOf, locate } from "../core/find.ts";
import { updateItem } from "../core/ops.ts";
import { type Item } from "../core/types.ts";
import { clamp } from "../lib/format";
import { useStudio } from "../store/editor-store";

/** How close, as a share of the frame, a press must be to count as touching the selected item. */
const REACH = { x: 0.42, y: 0.09 };

type Placed = Extract<Item, { kind: "text" | "caption" | "image" }>;

const centre = (item: Placed): { x: number; y: number } =>
  item.kind === "image" ? { x: item.x, y: item.y } : { x: item.style.x ?? 0.5, y: item.style.y };

/**
 * Lets the selected text, caption or picture be dragged around the preview.
 * A press only grabs it when it lands near the item, so clicking empty frame
 * does nothing instead of throwing the item across the screen.
 */
export function useCanvasDrag(canvas: HTMLCanvasElement | null): void {
  useEffect(() => {
    if (!canvas) return;
    const onDown = (event: PointerEvent): void => {
      const { selection, history, currentTime } = useStudio.getState();
      const found = selection ? locate(history.present, selection)?.item : undefined;
      if (!found || (found.kind !== "text" && found.kind !== "caption" && found.kind !== "image")) return;
      if (currentTime < found.start || currentTime >= endOf(found)) return;

      const box = canvas.getBoundingClientRect();
      const at = (e: PointerEvent): { x: number; y: number } => ({ x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height });
      const start = at(event);
      const origin = centre(found);
      const reach = found.kind === "image" ? { x: found.scale / 2 + 0.03, y: found.scale / 2 + 0.03 } : REACH;
      if (Math.abs(start.x - origin.x) > reach.x || Math.abs(start.y - origin.y) > reach.y) return;

      event.preventDefault();
      const id = found.id;
      const move = (e: PointerEvent): void => {
        const now = at(e);
        const x = clamp(origin.x + now.x - start.x, 0.02, 0.98);
        const y = clamp(origin.y + now.y - start.y, 0.02, 0.98);
        useStudio.getState().drag((p) => {
          const item = locate(p, id)?.item;
          if (item?.kind === "image") return updateItem(p, id, { x, y });
          return item?.kind === "text" || item?.kind === "caption" ? updateItem(p, id, { style: { ...item.style, x, y } }) : updateItem(p, id, {});
        });
      };
      const stop = (): void => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        useStudio.getState().endDrag();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    };
    canvas.addEventListener("pointerdown", onDown);
    return () => canvas.removeEventListener("pointerdown", onDown);
  }, [canvas]);
}
