import { type AspectRatio } from "./schema-metadata";
import { totalSeconds, type ScriptScene, type VideoScript } from "./schema";

/**
 * The script, as the renderer receives it.
 *
 * The sheet is where a person reads and edits; this is what the model is
 * actually given, and the two are deliberately different documents. The sheet
 * separates mechanics from content so they can be reasoned about; the prompt
 * puts them back together in the order a director would read them.
 *
 * Two outputs, because the pipeline has two places to put this. The beats
 * become a shot list for a model that cuts between them itself, and the whole
 * thing becomes the brief, which is also the fallback for a model that does
 * not: `foldShots` folds the beats back into the brief rather than failing.
 */

/**
 * What the composer accepts for a message, matched to `sendSchema`. A prompt
 * over this is rejected at the boundary, so the compiler stays inside it rather
 * than producing something the composer will refuse to send.
 */
const PROMPT_LIMIT = 2000;

/** The provider's own ceiling for one beat's prompt. */
const SHOT_LIMIT = 500;

/** How each aspect ratio reads in a sentence, e.g. "vertical short-form video". */
const ORIENTATION: Record<AspectRatio, string> = {
  "9:16": "vertical",
  "16:9": "landscape",
  "1:1": "square",
};

/**
 * How much detail each scene carries.
 *
 * Three tiers rather than a slice at the end. Cutting the string would cut the
 * last scenes off the script, and a video that stops before its payoff is a
 * worse answer than one whose directions are terse: the shape is the thing
 * being bought here.
 */
type Detail =
  /** Everything, including camera notes and the retention list. */
  | { readonly kind: "full" }
  /** Those two dropped. A model infers both acceptably on its own. */
  | { readonly kind: "compact" }
  /** Every scene shortened to an equal share of what is left. */
  | { readonly kind: "tight"; readonly perScene: number };

export interface CompiledScript {
  readonly prompt: string;
  readonly shots: readonly { prompt: string; duration: number }[];
  readonly durationSeconds: number;
}

/** `0:03` rather than `3`, so the timings read as a timeline. */
function timecode(seconds: number): string {
  return `0:${String(seconds).padStart(2, "0")}`;
}

function sceneLines(scene: ScriptScene, at: number, detail: Detail): string[] {
  /*
   * Untouched outside "tight". The room is only ever finite in that one tier;
   * `Infinity - Infinity` is `NaN`, and `str.slice(0, NaN)` silently returns
   * "", which took the visual line to empty on every scene in every other
   * tier, the exact field the compiler exists to protect.
   */
  const forSpeech =
    detail.kind === "tight" ? Math.floor(detail.perScene / 2) : scene.voiceover.length;
  const visual =
    detail.kind === "tight" ? scene.visual.slice(0, detail.perScene - forSpeech) : scene.visual;
  const voiceover = detail.kind === "tight" ? scene.voiceover.slice(0, forSpeech) : scene.voiceover;

  return [
    `SCENE ${scene.purpose.toUpperCase()} (${timecode(at)}-${timecode(at + scene.seconds)})`,
    `Visual: ${visual}`,
    detail.kind === "full" && scene.camera ? `Camera: ${scene.camera}` : "",
    // Quoted, and labelled as speech rather than as narration. A video model
    // given a line in quotes has the person on screen say it; given the same
    // words unquoted it tends to produce a voiceover over B-roll, which is the
    // opposite of the human-led videos this path exists for.
    voiceover ? `Spoken aloud, in shot: "${voiceover}"` : "",
    scene.onScreenText ? `On-screen text: "${scene.onScreenText}"` : "",
  ].filter(Boolean);
}

function header(script: VideoScript, detail: Detail): string[] {
  const { metadata, mechanics, subject, generationInstructions } = script;

  return [
    `A ${totalSeconds(script.scenes)} second ${ORIENTATION[metadata.aspectRatio]} short-form video: ${script.title}`,
    "",
    `Speaker on camera: ${subject.speaker}`,
    `Audience: ${subject.audience}`,
    `Subject: ${subject.topic}`,
    subject.product ? `Product: ${subject.product}` : "",
    subject.location ? `Location: ${subject.location}` : "",
    `Ends on: ${subject.cta}`,
    "",
    `Hook: ${mechanics.hookType}. Pacing: ${mechanics.pacing}. Emotional arc: ${mechanics.emotionalArc}.`,
    generationInstructions.style ? `Style: ${generationInstructions.style}.` : "",
    detail.kind === "full" && mechanics.retention.length > 0
      ? `Hold attention by: ${mechanics.retention.join("; ")}.`
      : "",
    // Cinematography, audio and the negative list go with camera and retention:
    // detail a model infers acceptably on its own when space is tight.
    detail.kind === "full" && generationInstructions.cinematography
      ? `Cinematography: ${generationInstructions.cinematography}.`
      : "",
    detail.kind === "full" && generationInstructions.audio
      ? `Audio: ${generationInstructions.audio}.`
      : "",
    detail.kind === "full" && generationInstructions.negativePrompts.length > 0
      ? `Avoid: ${generationInstructions.negativePrompts.join("; ")}.`
      : "",
    // Never dropped, unlike the above: this is a literal instruction to the
    // render model rather than creative detail it can infer without.
    generationInstructions.modelInstructions
      ? `Also: ${generationInstructions.modelInstructions}.`
      : "",
  ].filter(Boolean);
}

function build(script: VideoScript, detail: Detail): string {
  let at = 0;
  const body = script.scenes.flatMap((scene) => {
    const lines = ["", ...sceneLines(scene, at, detail)];
    at += scene.seconds;
    return lines;
  });

  return [...header(script, detail), ...body].join("\n");
}

/**
 * The space each scene may spend on its line and its picture.
 *
 * Measured rather than estimated: the same script is built once with those two
 * fields emptied, which prices the header, the timecodes, the labels and the
 * captions exactly. Guessing the overhead is how a limit ends up being missed
 * by the one script that was slightly wordier than the guess.
 */
function perSceneRoom(script: VideoScript): number {
  const bare = build(
    {
      ...script,
      // One character rather than none for the line: an empty voiceover drops
      // its whole row, and the row's label and quotation marks are part of the
      // overhead being priced. Measuring without them under-counts by enough to
      // push the longest scripts back over the limit.
      scenes: script.scenes.map((scene) => ({ ...scene, visual: "", voiceover: "x" })),
    },
    { kind: "compact" },
  );
  // Floored well above zero: a scene reduced to nothing is a scene missing, and
  // the last resort is still a script rather than a list of timecodes.
  return Math.max(80, Math.floor((PROMPT_LIMIT - bare.length) / script.scenes.length));
}

/**
 * Compiles the script, shortening only as far as it has to.
 *
 * The camera notes and the retention list go first, because a model infers both
 * acceptably on its own. Only if that is still too long does every scene give up
 * an equal share of its detail, which keeps the shape intact when the script is
 * unusually wordy.
 */
export function compileScript(script: VideoScript): CompiledScript {
  const full = build(script, { kind: "full" });
  const compact = full.length <= PROMPT_LIMIT ? full : build(script, { kind: "compact" });
  const prompt =
    compact.length <= PROMPT_LIMIT
      ? compact
      : build(script, { kind: "tight", perScene: perSceneRoom(script) }).slice(0, PROMPT_LIMIT);

  return {
    prompt,
    shots: script.scenes.map((scene) => ({
      prompt: sceneLines(scene, 0, { kind: "full" }).slice(1).join(" ").slice(0, SHOT_LIMIT),
      duration: scene.seconds,
    })),
    durationSeconds: totalSeconds(script.scenes),
  };
}
