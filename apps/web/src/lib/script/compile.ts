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
  const room = detail.kind === "tight" ? detail.perScene : Number.POSITIVE_INFINITY;
  // Split between the two fields that carry the scene. The line goes first
  // because it is what makes the person on screen speak.
  const forSpeech = Math.floor(room / 2);

  return [
    `SCENE ${scene.purpose.toUpperCase()} (${timecode(at)}-${timecode(at + scene.seconds)})`,
    `Visual: ${scene.visual.slice(0, room - forSpeech)}`,
    detail.kind === "full" && scene.camera ? `Camera: ${scene.camera}` : "",
    // Quoted, and labelled as speech rather than as narration. A video model
    // given a line in quotes has the person on screen say it; given the same
    // words unquoted it tends to produce a voiceover over B-roll, which is the
    // opposite of the human-led videos this path exists for.
    scene.voiceover ? `Spoken aloud, in shot: "${scene.voiceover.slice(0, forSpeech)}"` : "",
    scene.onScreenText ? `On-screen text: "${scene.onScreenText}"` : "",
  ].filter(Boolean);
}

function header(script: VideoScript, detail: Detail): string[] {
  const { mechanics, subject } = script;

  return [
    `A ${totalSeconds(script.scenes)} second vertical short-form video: ${script.title}`,
    "",
    `Speaker on camera: ${subject.speaker}`,
    `Audience: ${subject.audience}`,
    `Subject: ${subject.topic}`,
    subject.product ? `Product: ${subject.product}` : "",
    subject.location ? `Location: ${subject.location}` : "",
    `Ends on: ${subject.cta}`,
    "",
    `Hook: ${mechanics.hookType}. Pacing: ${mechanics.pacing}. Emotional arc: ${mechanics.emotionalArc}.`,
    detail.kind === "full" && mechanics.retention.length > 0
      ? `Hold attention by: ${mechanics.retention.join("; ")}.`
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
