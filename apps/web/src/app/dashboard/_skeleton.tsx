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
