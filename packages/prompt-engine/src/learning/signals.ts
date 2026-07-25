/**
 * Deterministic, explainable signals computed without an LLM. They run first as
 * a cheap gate (obvious spam/noise never reaches the judge or the embedder) and
 * also feed the objective dimensions of the evaluation. Being programmatic makes
 * them fast, free, and auditable.
 */

const GENERIC_PHRASES = [
  "high quality",
  "amazing",
  "stunning",
  "beautiful",
  "professional",
  "best",
  "awesome",
  "trending",
  "4k",
  "8k",
  "please",
  "thanks",
  "make it good",
  "very nice",
];

const URL_RE = /https?:\/\/|www\./i;

export interface SpamVerdict {
  isSpam: boolean;
  reasons: string[];
}

/** Fast noise/spam gate. Conservative: only flags clear junk. */
export function detectSpam(text: string): SpamVerdict {
  const reasons: string[] = [];
  const trimmed = text.trim();
  if (trimmed.length < 8) reasons.push("too short to carry knowledge");
  if (URL_RE.test(trimmed)) reasons.push("contains a URL");
  if (/(.)\1{6,}/.test(trimmed)) reasons.push("repeated-character run");
  if (capsRatio(trimmed) > 0.6 && trimmed.length > 20) reasons.push("mostly uppercase");
  if (/[!?]{4,}/.test(trimmed)) reasons.push("excessive punctuation");
  if (uniqueWordRatio(trimmed) < 0.35 && wordCount(trimmed) > 12) reasons.push("highly repetitive");
  return { isSpam: reasons.length > 0, reasons };
}

/** 0..1, higher means more filler/generic (worse). */
export function genericScore(text: string): number {
  const lower = text.toLowerCase();
  const hits = GENERIC_PHRASES.filter((phrase) => lower.includes(phrase)).length;
  const words = Math.max(1, wordCount(text));
  // Density of generic phrases, saturating so a couple of hits already matters.
  return clamp01(1 - Math.exp(-hits / Math.sqrt(words)));
}

/** 0..1, higher means more specific (concrete nouns, numbers, detail). */
export function specificityScore(text: string): number {
  const numbers = (text.match(/\d/g) ?? []).length > 0 ? 0.2 : 0;
  const properNouns = (text.match(/\b[A-Z][a-z]{2,}/g) ?? []).length;
  const length = clamp01(wordCount(text) / 60);
  const nounSignal = clamp01(properNouns / 8);
  const generic = genericScore(text);
  return clamp01(0.35 * length + 0.25 * nounSignal + numbers + 0.2 * (1 - generic));
}

/** 0..1, unique-token ratio scaled toward a healthy density band. */
export function informationDensityScore(text: string): number {
  const ratio = uniqueWordRatio(text);
  const length = clamp01(wordCount(text) / 40);
  return clamp01(0.6 * ratio + 0.4 * length);
}

/** 0..1, rough readability: penalizes very long run-on sentences. */
export function clarityScore(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return 0.3;
  const avgWords = wordCount(text) / sentences.length;
  // Sweet spot ~8-24 words/sentence; penalize far outside it.
  const penalty = Math.min(1, Math.abs(avgWords - 16) / 30);
  return clamp01(1 - penalty);
}

function capsRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return 0;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function uniqueWordRatio(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
