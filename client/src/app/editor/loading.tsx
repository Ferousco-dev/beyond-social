/**
 * The editor while it loads.
 *
 * This route reads the thread, the saved timeline and the latest render, and
 * signs a URL for every clip before it can paint anything. With no boundary that
 * was a blank screen for the whole of it, on the heaviest page in the app.
 *
 * Shaped like the real thing rather than a spinner: the bars are where the top
 * bar, player and timeline land, so the layout does not jump when it arrives.
 */
export default function EditorLoading() {
  return (
    <div data-surface="workspace" className="flex h-dvh flex-col bg-canvas" aria-busy>
      <span className="sr-only">Loading the editor</span>

      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline px-4">
        <div className="size-7 animate-pulse rounded-lg bg-cloud" />
        <div className="h-3.5 w-40 animate-pulse rounded bg-cloud" />
        <div className="ml-auto h-8 w-24 animate-pulse rounded-full bg-cloud" />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="aspect-[9/16] h-full max-h-[52vh] animate-pulse rounded-xl bg-cloud" />
      </div>

      <div className="h-44 shrink-0 space-y-2 border-t border-hairline p-4">
        {[0, 1, 2, 3].map((track) => (
          <div key={track} className="flex items-center gap-2">
            <div className="h-8 w-24 shrink-0 animate-pulse rounded bg-cloud" />
            <div className="h-8 flex-1 animate-pulse rounded bg-cloud" />
          </div>
        ))}
      </div>
    </div>
  );
}
