/**
 * Two cards with pictures in them, which the generic settings skeleton does not
 * resemble at all: it draws form rows, and this page is a square and a shelf.
 */
export default function BrandLoading() {
  return (
    <section className="mt-6 lg:mt-8" aria-busy>
      <span className="sr-only">Loading your pictures</span>

      <div className="rounded-2xl border border-hairline bg-paper p-5">
        <div className="h-4 w-16 animate-pulse rounded bg-cloud" />
        <div className="mt-3 h-3 w-full max-w-md animate-pulse rounded bg-cloud" />
        <div className="mt-5 flex items-center gap-4">
          <div className="size-24 shrink-0 animate-pulse rounded-2xl bg-cloud" />
          <div className="h-9 w-32 animate-pulse rounded-full bg-cloud" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-hairline bg-paper p-5">
        <div className="h-4 w-28 animate-pulse rounded bg-cloud" />
        <div className="mt-3 h-3 w-full max-w-md animate-pulse rounded bg-cloud" />
        <div className="mt-5 flex flex-wrap gap-3">
          {[0, 1, 2].map((tile) => (
            <div key={tile} className="size-24 animate-pulse rounded-xl bg-cloud" />
          ))}
        </div>
      </div>
    </section>
  );
}
