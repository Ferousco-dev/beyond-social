import { endOf } from "../core/find.ts";
import { type Item, type Project } from "../core/types.ts";
import { drawCaption } from "./draw-caption";

/**
 * Draws one frame of a project. The preview and, later, the export both call
 * this, so what is shown is what gets rendered.
 */
export interface FrameSources {
  video: (itemId: string) => HTMLVideoElement | undefined;
  image: (src: string) => HTMLImageElement | undefined;
}

const isActive = (item: Item, time: number): boolean => time >= item.start && time < endOf(item);

function drawContained(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, width: number, height: number): void {
  if (sw === 0 || sh === 0) return;
  const scale = Math.min(width / sw, height / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
}

export function drawFrame(ctx: CanvasRenderingContext2D, project: Project, time: number, sources: FrameSources): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  const active = (kind: Item["kind"]): Item[] =>
    project.tracks.flatMap((track) => track.items.filter((item) => item.kind === kind && isActive(item, time)));

  for (const item of active("video")) {
    const video = sources.video(item.id);
    if (video && video.readyState >= 2) drawContained(ctx, video, video.videoWidth, video.videoHeight, width, height);
  }
  for (const item of active("image")) {
    if (item.kind !== "image") continue;
    const image = sources.image(item.src);
    if (!image || !image.complete || image.naturalWidth === 0) continue;
    const w = width * item.scale;
    const h = (image.naturalHeight / image.naturalWidth) * w;
    ctx.drawImage(image, item.x * width - w / 2, item.y * height - h / 2, w, h);
  }
  for (const item of active("caption")) {
    if (item.kind === "caption") drawCaption(ctx, item, project, time);
  }
}
