import { MAX_LENGTH } from "./pacing.ts";

/** The limits the server enforces on a storyboard; the editor keeps edits inside them. */
export const MIN_SHOT = 3;
export const MAX_SHOT = 8;
export const MAX_SHOTS = 45;
/** The shortest and longest clip one request renders. */
const MIN_CLIP = 3;
/** The most a clip prompt may hold, leaving room for the director's own additions. */
const MAX_CLIP_RUNES = 2300;

/** One cut of the video, as the person sees and edits it. */
export interface Shot {
  readonly id: string;
  readonly seconds: number;
  readonly visual: string;
  readonly camera: string;
  readonly voiceover: string;
  readonly onScreenText: string;
}

/** A plan for a video of an exact length, written for that length. */
export interface Storyboard {
  readonly title: string;
  /** One description of the people, place and style every shot shares. */
  readonly look: string;
  readonly shots: readonly Shot[];
  /** What the plan was written from, so a change to any of it can be noticed. */
  readonly basis: string;
}

export function totalSeconds(shots: readonly Shot[]): number {
  return shots.reduce((sum, shot) => sum + shot.seconds, 0);
}

/**
 * Identifies what a storyboard was written for: the length and the script. A
 * plan whose basis no longer matches is stale and offered a rewrite, never
 * silently replaced, because the person may have edited it.
 */
export function basisOf(input: { readonly seconds: number; readonly script: string }): string {
  return `${Math.round(input.seconds)}|${input.script.trim()}`;
}

export function isStale(plan: Storyboard | null, input: { readonly seconds: number; readonly script: string }): boolean {
  return plan !== null && plan.basis !== basisOf(input);
}

/** How the plan's running time compares with the chosen length: "exact", or the seconds missing or over. */
export function gap(plan: Storyboard, seconds: number): { readonly kind: "exact" | "short" | "over"; readonly by: number } {
  const diff = seconds - totalSeconds(plan.shots);
  if (diff === 0) return { kind: "exact", by: 0 };
  return diff > 0 ? { kind: "short", by: diff } : { kind: "over", by: -diff };
}

/** A plan can start only when it runs exactly the chosen length, with every shot showing something. */
export function isReady(plan: Storyboard | null, seconds: number): boolean {
  if (!plan || plan.shots.length === 0) return false;
  return gap(plan, seconds).kind === "exact" && plan.shots.every((shot) => shot.visual.trim() !== "");
}

const clamp = (value: number): number => Math.min(MAX_SHOT, Math.max(MIN_SHOT, Math.round(value)));

export function editShot(plan: Storyboard, id: string, change: Partial<Omit<Shot, "id">>): Storyboard {
  return {
    ...plan,
    shots: plan.shots.map((shot) => (shot.id === id ? { ...shot, ...change, seconds: change.seconds === undefined ? shot.seconds : clamp(change.seconds) } : shot)),
  };
}

export function removeShot(plan: Storyboard, id: string): Storyboard {
  if (plan.shots.length <= 1) return plan;
  return { ...plan, shots: plan.shots.filter((shot) => shot.id !== id) };
}

/** Adds an empty shot after another, or at the end. */
export function addShot(plan: Storyboard, afterId?: string): Storyboard {
  if (plan.shots.length >= MAX_SHOTS) return plan;
  const fresh: Shot = { id: crypto.randomUUID(), seconds: MIN_SHOT, visual: "", camera: "", voiceover: "", onScreenText: "" };
  const at = afterId === undefined ? plan.shots.length : plan.shots.findIndex((shot) => shot.id === afterId) + 1;
  return { ...plan, shots: [...plan.shots.slice(0, at), fresh, ...plan.shots.slice(at)] };
}

export function moveShot(plan: Storyboard, id: string, direction: -1 | 1): Storyboard {
  const from = plan.shots.findIndex((shot) => shot.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= plan.shots.length) return plan;
  const shots = [...plan.shots];
  const [moved] = shots.splice(from, 1);
  if (!moved) return plan;
  shots.splice(to, 0, moved);
  return { ...plan, shots };
}

/** The words said over the whole video, in order: one voiceover that reads straight through. */
export function voiceoverOf(plan: Storyboard): string {
  return plan.shots.map((shot) => shot.voiceover.trim()).filter((line) => line !== "").join(" ");
}

/** A voiceover that was made, kept with the words it was made from so a change to the words is noticed. */
export interface Voiceover {
  readonly mediaId: string;
  /** The recording's real length, read from the file. */
  readonly seconds: number;
  /** The words that were read aloud. */
  readonly text: string;
  /** The voice it was read in. Absent on a recording made before voices could be chosen. */
  readonly voice?: string;
}

/** The voiceover is usable only when it was made from the words the storyboard says now. */
export function voiceoverMatches(plan: Storyboard | null, voiceover: Voiceover | null): boolean {
  return plan !== null && voiceover !== null && voiceover.text === voiceoverOf(plan);
}

/**
 * How a recording of this length sits in a video of the chosen length. A
 * recording longer than the video would be cut off, so it must be fixed first;
 * a much shorter one only leaves silence at the end, which is worth a warning.
 */
export function voiceoverFit(
  audioSeconds: number,
  videoSeconds: number,
  words: number,
): { readonly kind: "fits" | "long" | "short"; readonly seconds: number; readonly words: number } {
  const diff = audioSeconds - videoSeconds;
  const pace = audioSeconds > 0 && words > 0 ? words / audioSeconds : 2.5;
  if (diff > 1.5) return { kind: "long", seconds: Math.ceil(diff), words: Math.ceil(diff * pace) };
  if (-diff > Math.max(4, videoSeconds * 0.2)) return { kind: "short", seconds: Math.floor(-diff), words: Math.floor(-diff * pace) };
  return { kind: "fits", seconds: 0, words: 0 };
}

/**
 * Groups neighbouring shots into clips of at most 15 seconds, in order. Filling
 * each clip until the next shot would not fit uses the fewest clips possible
 * for shots that must stay in order.
 */
export function groupShots(shots: readonly Shot[]): Shot[][] {
  const clips: Shot[][] = [];
  let current: Shot[] = [];
  let used = 0;
  for (const shot of shots) {
    if (current.length > 0 && used + shot.seconds > MAX_LENGTH) {
      clips.push(current);
      current = [];
      used = 0;
    }
    current.push(shot);
    used += shot.seconds;
  }
  if (current.length > 0) clips.push(current);
  return clips;
}

function clipText(text: string, runes: number): string {
  const chars = Array.from(text);
  return chars.length <= runes ? text : chars.slice(0, runes).join("").trim();
}

/** One clip to render: the prompt for the shots it holds, and its length. */
export interface ClipPlan {
  readonly prompt: string;
  readonly seconds: number;
}

/**
 * The clips of a long video from an approved storyboard. Every clip repeats the
 * shared look and its place in the story, and lists its shots with their length,
 * so the pieces read as one video when joined.
 */
export function clipsFromStoryboard(plan: Storyboard, extra = "", narrated = false): ClipPlan[] {
  const groups = groupShots(plan.shots);
  return groups.map((shots, index) => {
    const seconds = Math.max(MIN_CLIP, Math.min(MAX_LENGTH, totalSeconds(shots)));
    const lines = [
      `Part ${index + 1} of ${groups.length} of one continuous video. Keep the same people, clothes, place and light in every part.`,
      plan.look.trim(),
      extra.trim(),
      ...(narrated ? ["Silent footage with no one speaking to camera; a narrator is added later."] : []),
      ...shots.map((shot, at) => {
        const parts = [`Shot ${at + 1} (${shot.seconds}s): ${shot.visual.trim()}`];
        if (shot.camera.trim() !== "") parts.push(`Camera: ${shot.camera.trim()}.`);
        // A narrated video has its words laid over silent footage, so the picture must not have anyone speaking.
        if (!narrated && shot.voiceover.trim() !== "") parts.push(`Said: "${shot.voiceover.trim()}"`);
        return parts.join(" ");
      }),
    ].filter((line) => line !== "");
    return { prompt: clipText(lines.join("\n"), MAX_CLIP_RUNES), seconds };
  });
}
