import { animatedAt, entranceAt } from "../core/animate.ts";
import { endOf } from "../core/find.ts";
import { type Item, type Project } from "../core/types.ts";
import { drawCaption } from "./draw-caption";

/**
 * Draws one frame of a project. The preview and the export both call this, so
 * what is shown is what gets rendered.
 */
export interface VideoFrame {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export interface FrameSources {
  video: (itemId: string) => VideoFrame | undefined;
  image: (src: string) => HTMLImageElement | undefined;
}

const isActive = (item: Item, time: number): boolean => time >= item.start && time < endOf(item);
const ease = (p: number): number => 1 - (1 - p) ** 3;

/**
 * Applies an item's entrance and opacity to the canvas and runs `draw` inside
 * it. Slide, zoom and wipe move or reveal the whole frame; fade and zoom also
 * fade the item in.
 */
function withMotion(ctx: CanvasRenderingContext2D, item: Item, time: number, draw: (opacity: number) => void): void {
  const { width, height } = ctx.canvas;
  const local = time - item.start;
  const enter = entranceAt(item, local);
  const p = enter ? ease(enter.progress) : 1;
  ctx.save();
  let opacity = animatedAt(item, local).opacity;
  if (enter?.type === "fade") opacity *= p;
  if (enter?.type === "slide") ctx.translate((1 - p) * width, 0);
  if (enter?.type === "zoom") {
    const s = 1.4 - 0.4 * p;
    ctx.translate(width / 2, height / 2);
    ctx.scale(s, s);
    ctx.translate(-width / 2, -height / 2);
    opacity *= p;
  }
  if (enter?.type === "wipe") {
    ctx.beginPath();
    ctx.rect(0, 0, width * p, height);
    ctx.clip();
  }
  ctx.globalAlpha = opacity;
  draw(opacity);
  ctx.restore();
}

function drawContained(ctx: CanvasRenderingContext2D, frame: VideoFrame): void {
  const { width, height } = ctx.canvas;
  if (frame.width === 0 || frame.height === 0) return;
  const scale = Math.min(width / frame.width, height / frame.height);
  const w = frame.width * scale;
  const h = frame.height * scale;
  ctx.drawImage(frame.source, (width - w) / 2, (height - h) / 2, w, h);
}

export function drawFrame(ctx: CanvasRenderingContext2D, project: Project, time: number, sources: FrameSources): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  const active = (kind: Item["kind"]): Item[] =>
    project.tracks.flatMap((track) => track.items.filter((item) => item.kind === kind && isActive(item, time)));

  for (const item of active("video")) {
    const frame = sources.video(item.id);
    if (!frame) continue;
    withMotion(ctx, item, time, () => {
      const a = animatedAt(item, time - item.start);
      ctx.translate((a.x ?? 0.5) * width, (a.y ?? 0.5) * height);
      ctx.scale(a.scale, a.scale);
      ctx.translate(-width / 2, -height / 2);
      drawContained(ctx, frame);
    });
  }
  for (const item of active("image")) {
    if (item.kind !== "image") continue;
    const image = sources.image(item.src);
    if (!image || !image.complete || image.naturalWidth === 0) continue;
    withMotion(ctx, item, time, () => {
      const a = animatedAt(item, time - item.start);
      const w = width * item.scale * a.scale;
      const h = (image.naturalHeight / image.naturalWidth) * w;
      ctx.drawImage(image, (a.x ?? item.x) * width - w / 2, (a.y ?? item.y) * height - h / 2, w, h);
    });
  }
  for (const item of [...active("text"), ...active("caption")]) {
    if (item.kind !== "caption" && item.kind !== "text") continue;
    withMotion(ctx, item, time, () => {
      const a = animatedAt(item, time - item.start);
      drawCaption(ctx, item, project, time, { x: a.x, y: a.y, scale: a.scale });
    });
  }
}
