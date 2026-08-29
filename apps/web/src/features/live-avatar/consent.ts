/**
 * The consent statement for training a HeyGen digital twin, kept out of the
 * actions file for the same reason `features/generation/consent.ts` is: a
 * "use server" module may only export async functions, and the recording UI
 * needs the wording to display while the action needs the version to record.
 *
 * Deliberately separate from `CONSENT_VERSION`/`CONSENT_STATEMENT` in
 * `features/generation/consent.ts`. That statement covers "a video was made
 * from this photo"; training a persistent, reusable digital twin is a
 * materially bigger promise and gets its own attestation, read aloud on
 * camera as part of the training recording itself, the same dual-purpose
 * idea `lib/voice/phrase.ts`'s enrollment phrase already uses.
 *
 * See docs/live-avatar/DESIGN.md for the full design this is one piece of.
 */

/** Bumped with the wording below; acceptances of older versions stop counting. */
export const HEYGEN_CONSENT_VERSION = 1;

/** Falls back to a neutral opening when there is no name to read. */
const ANONYMOUS = "I'm recording this";

export function heygenConsentStatement(name: string): string {
  const trimmed = name.trim();
  const first = trimmed.split(/\s+/)[0] ?? "";
  const opening = first === "" ? ANONYMOUS : `Hello, I'm ${first}. I'm recording this`;

  return [
    `${opening} so the app can create new videos of me, in my own voice, from anything I type.`,
    "I understand this trains a reusable digital version of my face and voice, which I can delete at any time from my settings.",
  ].join(" ");
}

/** Roughly how long the statement takes to read, for setting expectations. */
export const HEYGEN_CONSENT_SECONDS = 14;
