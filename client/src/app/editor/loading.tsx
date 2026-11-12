import { Logo } from "@/components/brand/logo";

/**
 * The editor while it loads: the mark and a blue progress bar, the way a design
 * tool opens a file, instead of a grey copy of the layout.
 *
 * The route reads the thread, the saved timeline and the latest render, and
 * signs a URL for every clip before it can paint, so there is a real wait. The
 * bar eases forward and holds near the end rather than looping, so it reads as
 * progress toward something.
 */
export default function EditorLoading() {
  return (
    <div data-surface="workspace" className="flex h-dvh flex-col items-center justify-center gap-7 bg-canvas" aria-busy>
      <span className="sr-only">Loading the editor</span>
      <Logo />
      <div className="h-1 w-48 overflow-hidden rounded-full bg-hairline" aria-hidden>
        <div
          className="h-full rounded-full bg-primary"
          style={{ animation: "editor-load 6s cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
        />
      </div>
    </div>
  );
}
