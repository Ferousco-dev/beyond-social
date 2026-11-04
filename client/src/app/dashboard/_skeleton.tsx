/** Shared skeleton pieces, so every loading state matches its real layout. */
export function SkeletonPage({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      {/* Matches the heading and lede every one of these pages opens with, so
          the swap to real content does not move anything. */}
      <div className="h-8 w-48 animate-pulse rounded-md bg-cloud" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded bg-cloud/60" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-cloud/40" />
        ))}
      </div>
    </div>
  );
}

/**
 * The home screen, which is not shaped like the pages above: a greeting and a
 * composer, centred in the viewport rather than running from the top.
 *
 * `SkeletonPage` would have been the easy reuse and the wrong one. It is
 * left-aligned in a wider column, so the swap to real content would visibly
 * jump, and a loading state that moves the page is worse than none.
 */
export function SkeletonHome() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
      {/* Matches the greeting's own reserved height, so the heading does not
          grow into place when it arrives. */}
      <div className="mb-10 flex min-h-[2.5rem] justify-center">
        <div className="h-8 w-64 animate-pulse rounded-md bg-cloud" />
      </div>
      <div className="h-28 w-full animate-pulse rounded-3xl bg-cloud/50" />
    </div>
  );
}
