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
