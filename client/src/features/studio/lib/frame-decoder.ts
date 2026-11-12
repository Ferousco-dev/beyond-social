import { type VideoFrame } from "./compose";

/**
 * Exact frames for the preview, decoded from the file itself.
 *
 * A `<video>` element is slow to land on an arbitrary time: during a seek it has
 * no picture, and the preview used to go black or freeze. Decoding the wanted
 * frame directly is how editors such as OpenCut avoid that. This runs beside the
 * element: the element still plays the sound and the moving picture, and this
 * fills the gaps (scrubbing, a seek in flight, a source still buffering) with the
 * right frame instead of nothing.
 *
 * The decoder library is large, so it loads the first time a frame is needed.
 */

interface Held extends VideoFrame {
  readonly time: number;
}

interface Entry {
  readonly src: string;
  /** Resolves to a decoder, or null when this file cannot be decoded (never retried). */
  readonly sink: Promise<{ getCanvas: (time: number) => Promise<{ canvas: CanvasImageSource & { width: number; height: number } } | null> } | null>;
  frame: Held | undefined;
  /** The time being decoded, and the newest time asked for while it runs. */
  busy: boolean;
  wanted: number | undefined;
}

/** A frame this close to the wanted time is as good as exact for a preview. */
const NEAR_SECONDS = 0.5;

async function openSink(src: string): Promise<Entry["sink"] extends Promise<infer S> ? S : never> {
  try {
    const { ALL_FORMATS, BlobSource, CanvasSink, Input, UrlSource } = await import("mediabunny");
    // A local copy is read from memory; fetching a blob address with ranges is not reliable everywhere.
    const source = src.startsWith("blob:") ? new BlobSource(await (await fetch(src)).blob()) : new UrlSource(src);
    const input = new Input({ source, formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return null;
    const sink = new CanvasSink(track);
    return {
      getCanvas: async (time) => {
        const wrapped = await sink.getCanvas(time);
        return wrapped ? { canvas: wrapped.canvas as CanvasImageSource & { width: number; height: number } } : null;
      },
    };
  } catch {
    return null;
  }
}

export class FrameDecoder {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly onFrame: () => void) {}

  /** The newest decoded frame for a clip if it is near `time`, else nothing. */
  frameNear(id: string, time: number): Held | undefined {
    const frame = this.entries.get(id)?.frame;
    return frame && Math.abs(frame.time - time) <= NEAR_SECONDS ? frame : undefined;
  }

  /** Asks for the frame at `time`. Only the newest ask is decoded; older ones are dropped. */
  request(id: string, src: string, time: number): void {
    let entry = this.entries.get(id);
    if (!entry || entry.src !== src) {
      entry = { src, sink: openSink(src), frame: undefined, busy: false, wanted: undefined };
      this.entries.set(id, entry);
    }
    entry.wanted = time;
    if (!entry.busy) void this.run(entry);
  }

  private async run(entry: Entry): Promise<void> {
    entry.busy = true;
    try {
      const sink = await entry.sink;
      while (sink && entry.wanted !== undefined) {
        const time = entry.wanted;
        entry.wanted = undefined;
        const wrapped = await sink.getCanvas(time).catch(() => null);
        if (wrapped) {
          entry.frame = { source: wrapped.canvas, width: wrapped.canvas.width, height: wrapped.canvas.height, time };
          this.onFrame();
        }
      }
    } finally {
      entry.busy = false;
    }
  }

  forget(id: string): void {
    this.entries.delete(id);
  }

  dispose(): void {
    this.entries.clear();
  }
}
