/**
 * The assets page while it loads.
 *
 * Three cards of roughly the heights the real ones settle at, so the page does
 * not reflow when the library and the voice profile arrive.
 */
export default function AssetsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10" aria-busy>
      <span className="sr-only">Loading your assets</span>

      <div className="h-8 w-32 animate-pulse rounded bg-cloud" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-cloud" />

      <div className="mt-6 flex flex-col gap-4 lg:mt-8">
        {[0, 1, 2].map((card) => (
          <div key={card} className="h-32 animate-pulse rounded-2xl bg-cloud" />
        ))}
      </div>
    </div>
  );
}
