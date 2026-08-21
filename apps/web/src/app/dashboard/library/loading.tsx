/**
 * The library while it loads.
 *
 * Shaped like the grid it becomes rather than borrowed from the settings pages,
 * so the page does not reflow the moment the items arrive. The filter chips are
 * part of that shape: they are above the grid and they are what moves furthest
 * if they are not accounted for.
 */
export default function LibraryLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10" aria-busy>
      <span className="sr-only">Loading your library</span>

      <div className="h-8 w-40 animate-pulse rounded bg-cloud" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-cloud" />

      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3].map((chip) => (
          <div key={chip} className="h-8 w-24 animate-pulse rounded-full bg-cloud" />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, card) => (
          <div key={card} className="aspect-[9/16] animate-pulse rounded-xl bg-cloud" />
        ))}
      </div>
    </div>
  );
}
