/**
 * Time-aware greetings for the dashboard home. Each entry is a template with a
 * `{name}` slot; the slot is optional so the line still reads if a first name
 * is missing.
 */
interface GreetingBand {
  readonly untilHour: number;
  readonly lines: readonly string[];
}

const BANDS: readonly GreetingBand[] = [
  {
    untilHour: 5,
    lines: [
      "Burning the midnight oil, {name}?",
      "The quiet hours are yours, {name}",
      "Still up, {name}? Let us make something",
      "Night shift, {name}",
    ],
  },
  {
    untilHour: 9,
    lines: [
      "Good morning, {name}",
      "Early start, {name}",
      "First light, {name}. What are we making?",
      "Morning, {name}. The feed is waiting",
    ],
  },
  {
    untilHour: 12,
    lines: [
      "Good morning, {name}",
      "What is on the storyboard, {name}?",
      "Let us get something shipped, {name}",
      "Morning, {name}. Ready when you are",
    ],
  },
  {
    untilHour: 17,
    lines: [
      "Good afternoon, {name}",
      "Afternoon, {name}. What are we filming?",
      "Back at it, {name}",
      "Let us make something worth watching, {name}",
    ],
  },
  {
    untilHour: 21,
    lines: [
      "Good evening, {name}",
      "Evening, {name}. One more idea?",
      "Golden hour, {name}",
      "Winding down or just starting, {name}?",
    ],
  },
  {
    untilHour: 24,
    lines: [
      "Late one, {name}",
      "The night owl special, {name}",
      "Still going, {name}?",
      "Evening, {name}. Let us keep it short and sharp",
    ],
  },
];

function bandFor(hour: number): GreetingBand {
  return BANDS.find((band) => hour < band.untilHour) ?? (BANDS[BANDS.length - 1] as GreetingBand);
}

/** The part of a full name we address someone by. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * Picks a greeting for the moment. `variant` selects between the lines in the
 * band, so callers can vary it per visit without this function reaching for
 * randomness itself.
 */
export function buildGreeting(name: string, at: Date, variant: number): string {
  const { lines } = bandFor(at.getHours());
  const line = lines[Math.abs(variant) % lines.length] ?? (lines[0] as string);
  const short = firstName(name);
  return short ? line.replace("{name}", short) : line.replace(", {name}", "").replace("{name}", "");
}
