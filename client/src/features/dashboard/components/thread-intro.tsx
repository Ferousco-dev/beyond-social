/**
 * What an empty thread says.
 *
 * Two different situations that look the same and are not: an empty composer
 * waiting for an idea, and a composer already filled from somewhere else. The
 * second needs to say the brief is there and is theirs to edit, or a seeded
 * turn reads as the product having decided something on their behalf.
 */
export function ThreadIntro({ seeded }: { seeded: boolean }) {
  return (
    <div className="text-center">
      {seeded ? (
        <>
          <p className="text-sm font-medium text-ink">Ready when you are</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            We have filled in the brief below. Read it over, change anything you want, then send it
            to start the render.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-ink">Describe the video you want</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            Say what it is for and who it is for. Add photos and they become the footage.
          </p>
        </>
      )}
    </div>
  );
}
