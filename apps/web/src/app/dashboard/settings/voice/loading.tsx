/**
 * Two explanatory cards, not a form.
 *
 * The page itself already streams the enrolment card through a Suspense
 * boundary, so this only covers the moment before either is on screen.
 */
export default function VoiceLoading() {
  return (
    <section className="mt-6 flex flex-col gap-4 lg:mt-8" aria-busy>
      <span className="sr-only">Loading your voice settings</span>

      {[0, 1].map((card) => (
        <div key={card} className="rounded-2xl border border-hairline bg-paper p-5">
          <div className="flex items-start gap-4">
            <div className="size-10 shrink-0 animate-pulse rounded-xl bg-cloud" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-cloud" />
              <div className="mt-2 h-3 w-full max-w-lg animate-pulse rounded bg-cloud" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
