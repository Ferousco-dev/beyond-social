/**
 * A list of remembered sentences, which is what this page always is. Rows
 * rather than form fields, so nothing jumps when the real ones arrive.
 */
export default function MemoryLoading() {
  return (
    <section className="mt-6 lg:mt-8" aria-busy>
      <span className="sr-only">Loading what has been remembered</span>

      <div className="h-3 w-full max-w-2xl animate-pulse rounded bg-cloud" />

      <div className="mt-8 flex items-center justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-cloud" />
        <div className="h-9 w-36 animate-pulse rounded-full bg-cloud" />
      </div>

      <div className="mt-3 space-y-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-16 animate-pulse rounded-xl bg-cloud" />
        ))}
      </div>
    </section>
  );
}
