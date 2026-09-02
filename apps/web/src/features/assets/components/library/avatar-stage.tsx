import { type ReactNode } from "react";

/**
 * The lit portrait on the right of the avatar panel.
 *
 * A real photo when one is saved, and otherwise a silhouette drawn in svg with
 * the same rim light on it. Drawn rather than illustrated on purpose: a stock
 * face standing in for somebody's likeness is the one placeholder this feature
 * must never use, and an abstract shape says "no face yet" without pretending
 * to be one.
 *
 * The glow is two radials and a blurred edge rather than a shadow, so it reads
 * as light falling on the subject rather than as a card floating.
 */
export function AvatarStage({ photoUrl }: { photoUrl: string | null }): ReactNode {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] overflow-hidden rounded-r-2xl">
      {/* Ambient light behind the subject, warmest at the shoulders. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 60% 78%, color-mix(in srgb, var(--primary) 42%, transparent), transparent 70%), radial-gradient(45% 40% at 72% 30%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 72%)",
        }}
      />

      {photoUrl === null ? (
        <svg
          viewBox="0 0 240 260"
          className="absolute inset-0 size-full"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
              <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
            </linearGradient>
            <filter id="soften" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
          </defs>
          {/* Head and shoulders, as one path, lit only at its edge. */}
          <g filter="url(#soften)">
            <path
              d="M120 44c24 0 42 19 42 45 0 17-6 30-13 39 25 9 47 24 58 44 6 11 9 22 9 33v55H24v-55c0-11 3-22 9-33 11-20 33-35 58-44-7-9-13-22-13-39 0-26 18-45 42-45z"
              fill="color-mix(in srgb, var(--primary) 8%, transparent)"
              stroke="url(#rim)"
              strokeWidth="2.5"
            />
          </g>
        </svg>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover object-top opacity-90"
          />
          {/* Fades the photo into the panel so it sits in the light rather than
              looking pasted onto it. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, var(--paper) 2%, color-mix(in srgb, var(--paper) 55%, transparent) 34%, transparent 72%)",
            }}
          />
        </>
      )}
    </div>
  );
}
