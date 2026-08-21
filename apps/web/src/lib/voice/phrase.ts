/**
 * What somebody is asked to say when saving their voice.
 *
 * Three jobs at once, which is why it is not just "say something".
 *
 * It names them, so the recording carries its own claim of whose voice it is.
 * It states what the voice will be used for out loud, which is worth more than a
 * checkbox: a voiceprint is biometric data, and a recording of the person
 * agreeing in their own voice is the strongest record of consent this feature
 * can hold. And it is long and varied enough to be a usable sample, where a
 * three-word clip is not.
 *
 * The exact wording is stored with the recording. `voice_profiles.phrase` exists
 * so a later dispute can be checked against what was actually asked, and it was
 * being filled with the placeholder "Voice enrollment sample", which answered
 * nothing.
 */

/** Falls back to a neutral opening when the profile has no name on it. */
const ANONYMOUS = "this is my voice";

export function enrollmentPhrase(name: string): string {
  const trimmed = name.trim();
  // First name only. "Hello, I'm Sarah Okonkwo-Whitfield" reads like a deposition.
  const first = trimmed.split(/\s+/)[0] ?? "";
  const opening = first === "" ? ANONYMOUS : `I'm ${first}`;

  return [
    `Hello, ${opening}.`,
    "I am recording this so my own voice can narrate the videos I make.",
    "I understand it will be used to speak words I write later.",
  ].join(" ");
}

/** Roughly how long the phrase takes to read, for setting expectations. */
export const PHRASE_SECONDS = 12;
