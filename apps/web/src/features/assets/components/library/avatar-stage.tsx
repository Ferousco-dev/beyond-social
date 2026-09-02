import { type ReactNode } from "react";

/**
 * The lit portrait on the right of the avatar panel.
 *
 * A real photo when one is saved, and otherwise the house silhouette: a
 * rim-lit figure with no face, which is the point. It illustrates the idea of
 * a likeness without being anybody's, so it can stand in an empty state
 * without implying that something has been recorded.
 *
 * It fades into the panel from the left rather than sitting in a frame, so the
 * copy beside it stays readable at every width and the picture reads as light
 * in the room rather than as an image pasted onto a card.
 */
export function AvatarStage({ photoUrl }: { photoUrl: string | null }): ReactNode {
  const source = photoUrl ?? "/brand/avatar-silhouette.jpg";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-0 w-[62%] overflow-hidden rounded-r-2xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={source} alt="" className="absolute inset-0 size-full object-cover object-top" />

      {/*
       * Two washes rather than one. The horizontal fade carries the picture
       * into the panel so the text never sits on top of it, and the cobalt
       * bloom underneath ties a saved photo to the same light the silhouette
       * was lit with, so the panel looks the same either way.
       */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, var(--paper) 1%, color-mix(in srgb, var(--paper) 72%, transparent) 30%, transparent 66%)",
        }}
      />
      <div
        className="absolute inset-0 mix-blend-screen opacity-60"
        style={{
          background:
            "radial-gradient(55% 50% at 62% 72%, color-mix(in srgb, var(--primary) 30%, transparent), transparent 72%)",
        }}
      />
    </div>
  );
}
