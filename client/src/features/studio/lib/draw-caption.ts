import { type Item, type Project } from "../core/types.ts";

type Caption = Extract<Item, { kind: "caption" | "text" }>;

const MAX_WIDTH = 0.9;
const LINE_HEIGHT = 1.25;

interface Placed {
  readonly text: string;
  readonly width: number;
  readonly index: number;
}

/** Fills lines greedily until a word would pass the maximum width. */
function wrap(ctx: CanvasRenderingContext2D, words: readonly string[], maxWidth: number, space: number): Placed[][] {
  const lines: Placed[][] = [[]];
  let used = 0;
  words.forEach((text, index) => {
    const width = ctx.measureText(text).width;
    const line = lines.at(-1)!;
    if (line.length > 0 && used + space + width > maxWidth) {
      lines.push([{ text, width, index }]);
      used = width;
    } else {
      line.push({ text, width, index });
      used += (line.length > 1 ? space : 0) + width;
    }
  });
  return lines;
}

/** Black or white, whichever reads better on a given colour. */
function readableOn(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const luminance = (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

/** Position and size set by keyframes, which take the place of the item's own while they apply. */
export interface CaptionMotion {
  readonly x?: number;
  readonly y?: number;
  readonly scale: number;
}

export function drawCaption(ctx: CanvasRenderingContext2D, item: Caption, project: Project, time: number, motion: CaptionMotion = { scale: 1 }): void {
  const { width, height } = ctx.canvas;
  const style = item.style;
  const preset = style.preset ?? "classic";
  const px = style.size * motion.scale * (height / project.height);
  const highlight = style.highlight ?? "#ffd400";
  const local = time - item.start;
  const words = item.kind === "caption" ? item.words : undefined;
  const spoken = words?.map((w) => w.text) ?? [item.text];
  let active = -1;
  words?.forEach((w, i) => {
    if (local >= w.start) active = i;
  });

  ctx.font = `${preset === "minimal" ? 600 : 800} ${px}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const space = ctx.measureText(" ").width;
  const lines = wrap(ctx, spoken, width * MAX_WIDTH, space);
  const lineHeight = px * LINE_HEIGHT;
  const top = (motion.y ?? style.y) * height - (lines.length * lineHeight) / 2;

  lines.forEach((line, row) => {
    const total = line.reduce((sum, w) => sum + w.width, 0) + space * (line.length - 1);
    const y = top + lineHeight * (row + 0.5);
    let x = (motion.x ?? style.x ?? 0.5) * width - total / 2;
    if (preset === "box") {
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.beginPath();
      ctx.roundRect(x - px * 0.35, y - lineHeight / 2, total + px * 0.7, lineHeight, px * 0.22);
      ctx.fill();
    }
    for (const word of line) {
      const current = word.index === active;
      if (preset === "pill" && current) {
        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.roundRect(x - px * 0.18, y - lineHeight * 0.46, word.width + px * 0.36, lineHeight * 0.92, px * 0.22);
        ctx.fill();
      }
      if (preset === "classic" || preset === "karaoke") {
        ctx.lineWidth = px * 0.16;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.strokeText(word.text, x, y);
      }
      if (preset === "minimal") {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = px * 0.2;
      }
      ctx.fillStyle = preset === "karaoke" && current ? highlight : preset === "pill" && current ? readableOn(highlight) : style.color;
      ctx.fillText(word.text, x, y);
      ctx.shadowBlur = 0;
      x += word.width + space;
    }
  });
}
