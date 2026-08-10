/**
 * Discover while it loads.
 *
 * Only the search bar and the suggestion chips, because that is all this page
 * has before anyone searches. A grid of shimmering video cards would promise
 * results that do not exist yet and have never been asked for.
 */
export default function DiscoverLoading() {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 py-6 sm:px-6" aria-busy>
      <span className="sr-only">Loading Discover</span>

      <div className="h-12 w-full animate-pulse rounded-full bg-cloud" />

      <div className="mt-6 flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((chip) => (
          <div key={chip} className="h-10 w-32 animate-pulse rounded-full bg-cloud" />
        ))}
      </div>
    </div>
  );
}
