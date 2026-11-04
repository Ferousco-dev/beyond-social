/**
 * The assets page while it loads: the header, the kind tabs and a grid of
 * tiles at the size the real ones settle at, so nothing reflows.
 */
export default function AssetsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8" aria-busy>
      <span className="sr-only">Loading your assets</span>

      <div className="h-8 w-32 animate-pulse rounded bg-cloud" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-cloud" />

      <div className="mt-6 flex gap-2 border-b border-hairline pb-2">
        {[0, 1, 2, 3, 4, 5].map((tab) => (
          <div key={tab} className="h-7 w-20 animate-pulse rounded bg-cloud" />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((tile) => (
          <div key={tile} className="aspect-[4/5] animate-pulse rounded-xl bg-cloud" />
        ))}
      </div>
    </div>
  );
}
