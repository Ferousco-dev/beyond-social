/**
 * Keeps a project's generation record inside the limits its schema checks.
 *
 * An over-long script or part prompt made the whole record fail the check,
 * and the editor then opened empty, unable to follow the video being made.
 * The texts here are only shown and re-sent as prompts, so cutting the end
 * off a very long one loses nothing the video needs.
 */

const LIMITS = { script: 5000, message: 500, direction: 2000 } as const;
const PART_LIMITS = { prompt: 2500, message: 300 } as const;
const TURN_LIMITS = { words: 5000 } as const;

type Loose = Record<string, unknown>;

const isRecord = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);

function clip(record: Loose, limits: Readonly<Record<string, number>>): Loose {
  const out: Loose = { ...record };
  for (const [key, max] of Object.entries(limits)) {
    const value = out[key];
    if (typeof value === "string" && value.length > max) out[key] = value.slice(0, max);
  }
  return out;
}

/** The same record with every text cut to fit. Anything that is not a record is returned as it is. */
export function fitGeneration<T>(raw: T): T {
  if (!isRecord(raw)) return raw;
  const out = clip(raw, LIMITS);
  if (Array.isArray(out.parts)) out.parts = out.parts.map((part) => (isRecord(part) ? clip(part, PART_LIMITS) : part));
  if (Array.isArray(out.turns)) out.turns = out.turns.map((turn) => (isRecord(turn) ? clip(turn, TURN_LIMITS) : turn));
  return out as T;
}
