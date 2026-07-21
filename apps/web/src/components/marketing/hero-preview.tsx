import { Play, Send, Sparkles } from "lucide-react";
import { type ReactNode } from "react";

const HASHTAGS: readonly string[] = ["#trailrunning", "#newdrop", "#running"];

/**
 * A realistic preview of the conversational creation surface. Everything shown
 * maps to a real feature: a chat prompt, the AI reply, generated scenes,
 * captions, and a rendering draft. No fabricated analytics or charts.
 */
export function HeroPreview(): ReactNode {
  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            New project
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
            Generating
          </span>
        </div>

        <div className="grid items-start gap-5 p-4 sm:grid-cols-[1fr_11rem]">
          <div className="flex flex-col gap-3">
            <p className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
              Make a 30-second video introducing our new trail running shoe. Upbeat, for Instagram.
            </p>
            <p className="mr-auto max-w-[90%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-sm text-secondary-foreground">
              On it. Opening on the shoe in motion, then three benefit beats with captions.
            </p>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Scenes
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((scene) => (
                  <div
                    key={scene}
                    className="flex aspect-video items-center justify-center rounded-md border border-border bg-secondary"
                  >
                    <Play className="size-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {HASHTAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-1 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
              <span className="text-sm text-muted-foreground">Describe your next video</span>
              <span className="ml-auto inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Send className="size-3.5" />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border bg-secondary">
              <span className="absolute left-1/2 top-1/2 inline-flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
                <Play className="size-3.5 translate-x-px" />
              </span>
              <span className="absolute inset-x-2 bottom-2 rounded-md bg-background/85 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
                New arrivals just dropped
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[86%] rounded-full bg-primary" />
            </div>
            <p className="text-[11px] tabular-nums text-muted-foreground">Generating 0:26 / 0:30</p>
          </div>
        </div>
      </div>
    </div>
  );
}
