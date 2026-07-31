/** Mirrors the market's header, filter bar and card grid, so nothing shifts. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="h-8 w-32 animate-pulse rounded-md bg-cloud" />
      <div className="mt-3 h-4 w-80 animate-pulse rounded bg-cloud/60" />
      <div className="mt-9 h-11 animate-pulse rounded-lg bg-cloud/60" />
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-8 w-24 animate-pulse rounded-full bg-cloud/60" />
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-xl bg-cloud/40" />
        ))}
      </div>
    </div>
  );
}
