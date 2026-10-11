/**
 * Behaviour checks for the script schema, the compiler, and the shot fold.
 * No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/script-smoke.ts
 *
 * Three things are asserted here, and each of them has a way of going wrong
 * that nobody would see until a credit had been spent. A reply that is nearly
 * right must not be thrown away whole. A compiled prompt must stay inside what
 * the composer accepts, because a script the composer refuses to send is worse
 * than a paragraph. And a shot list must never reach a model that cannot cut,
 * because the dispatcher refuses those outright.
 */
import { compileBrief } from "../src/lib/brief/compile";
import { briefSchema, parseJsonReply } from "../src/lib/brief/schema";
import { compileScript } from "../src/lib/script/compile";
import { videoScriptSchema, totalSeconds } from "../src/lib/script/schema";
import { foldShots } from "../src/lib/generation/shot-fold";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const mechanics = {
  hookType: "Curiosity gap",
  pacing: "Fast, a new picture every two to three seconds",
  emotionalArc: "Curiosity to concern to relief",
  retention: ["Open loop in the first line", "Payoff held to the last quarter"],
};

const subject = {
  topic: "Why most bakery websites lose orders",
  audience: "Independent bakery owners",
  speaker: "A baker in her early thirties, in her own shop",
  product: "Beyond Web Solutions",
  cta: "Book a free audit",
  location: "A small bakery counter",
};

const scene = (purpose: string, seconds: number) => ({
  purpose,
  seconds,
  voiceover: "Nobody tells you this about a bakery website.",
  visual: "The baker looks up from a laptop on the counter, flour on her hands.",
  camera: "Fast push in",
  onScreenText: "YOUR SITE IS COSTING YOU ORDERS",
});

const script = (payload: unknown) => parseJsonReply(JSON.stringify(payload), videoScriptSchema);

{
  const out = script({
    title: "The bakery website nobody warns you about",
    mechanics,
    subject,
    scenes: [scene("Hook", 3), scene("Problem", 4), scene("Payoff", 5)],
  });
  check("a complete script parses", "data" in out);
}

{
  // Both blocks are new. A reply from before they existed, or a model that
  // simply didn't fill them in, has to parse exactly as it always did.
  const out = script({
    title: "No metadata or generation instructions at all",
    mechanics,
    subject,
    scenes: [scene("Hook", 3), scene("Payoff", 4)],
  });
  check(
    "metadata defaults when the model never mentions it",
    "data" in out &&
      out.data.metadata.aspectRatio === "9:16" &&
      out.data.metadata.platform === "" &&
      out.data.metadata.category === "",
  );
  check(
    "generation instructions default when the model never mentions them",
    "data" in out &&
      out.data.generationInstructions.style === "" &&
      out.data.generationInstructions.cinematography === "" &&
      out.data.generationInstructions.audio === "" &&
      out.data.generationInstructions.negativePrompts.length === 0 &&
      out.data.generationInstructions.modelInstructions === "",
  );
}

{
  const out = script({
    title: "Fully specified",
    mechanics,
    subject,
    scenes: [scene("Hook", 3), scene("Payoff", 4)],
    metadata: { aspectRatio: "16:9", platform: "youtube", category: "Food and drink" },
    generationInstructions: {
      style: "Handheld, natural light",
      cinematography: "Mostly static, one push in on the payoff",
      audio: "Warm acoustic guitar under the voiceover",
      negativePrompts: ["No stock footage", "No text-heavy slides"],
      modelInstructions: "Keep every cut under three seconds",
    },
  });
  check(
    "a fully specified metadata and generation instructions block parses",
    "data" in out &&
      out.data.metadata.aspectRatio === "16:9" &&
      out.data.metadata.category === "Food and drink" &&
      out.data.generationInstructions.negativePrompts.length === 2,
  );

  if ("data" in out) {
    const compiled = compileScript(out.data);
    check(
      "the orientation follows the aspect ratio",
      compiled.prompt.includes("landscape short-form"),
    );
    check(
      "style reaches the compiled prompt",
      compiled.prompt.includes("Style: Handheld, natural light."),
    );
    check(
      "cinematography and audio reach the compiled prompt",
      compiled.prompt.includes("Cinematography: Mostly static") &&
        compiled.prompt.includes("Audio: Warm acoustic"),
    );
    check(
      "negative prompts are joined into an avoid line",
      compiled.prompt.includes("Avoid: No stock footage; No text-heavy slides."),
    );
    check(
      "model instructions reach the compiled prompt",
      compiled.prompt.includes("Also: Keep every cut under three seconds."),
    );
  }
}

{
  // One malformed scene must cost its own scene, not the script.
  const out = script({
    title: "Kept",
    mechanics,
    subject,
    scenes: [scene("Hook", 3), { purpose: "Broken" }, scene("Payoff", 4)],
  });
  check(
    "a bad scene is dropped, the rest survives",
    "data" in out && out.data.scenes.length === 2,
    "data" in out ? `${out.data.scenes.length} scenes` : out.reason,
  );
}

{
  // A single beat is not a script, and unlike a long string it cannot be
  // salvaged by trimming, so this stays a rejection.
  const out = script({ title: "Too thin", mechanics, subject, scenes: [scene("Hook", 3)] });
  check("one scene is refused", !("data" in out));
}

{
  const out = script({
    title: "Clamped",
    mechanics,
    subject,
    scenes: [scene("Hook", 99), scene("Payoff", 0)],
  });
  check(
    "scene seconds are clamped rather than rejected",
    "data" in out && out.data.scenes[0]!.seconds === 12 && out.data.scenes[1]!.seconds === 1,
  );
}

{
  const out = script({
    title: "Trimmed",
    mechanics,
    subject,
    scenes: [
      scene("Hook", 3),
      scene("A", 2),
      scene("B", 2),
      scene("C", 2),
      scene("D", 2),
      scene("E", 2),
    ],
  });
  check("no more scenes than the dispatcher takes", "data" in out && out.data.scenes.length === 5);
}

{
  const parsed = script({
    title: "Compiled",
    mechanics,
    subject,
    scenes: [scene("Hook", 3), scene("Problem", 4), scene("Payoff", 5)],
  });
  if (!("data" in parsed)) {
    check("compilation", false, parsed.reason);
  } else {
    const compiled = compileScript(parsed.data);
    check(
      "the prompt fits what the composer accepts",
      compiled.prompt.length <= 2000,
      `${compiled.prompt.length} chars`,
    );
    check(
      "the spoken line is quoted as speech",
      compiled.prompt.includes('Spoken aloud, in shot: "'),
    );
    // Regression: `Infinity - Infinity` is `NaN`, and `.slice(0, NaN)` silently
    // returns "", which took the visual line to empty on every scene outside
    // the one tier meant to shorten it.
    check(
      "the visual survives compilation, not just the voiceover",
      compiled.prompt.includes("The baker looks up from a laptop on the counter"),
    );
    check("one beat per scene", compiled.shots.length === parsed.data.scenes.length);
    check(
      "no beat exceeds the provider's limit",
      compiled.shots.every((shot) => shot.prompt.length <= 500),
    );
    check(
      "the beats add up to the script",
      compiled.durationSeconds === totalSeconds(parsed.data.scenes),
    );
  }
}

{
  // A very long script must still compile to something sendable: the camera
  // notes and the retention list go, the scenes never do.
  const long = "x".repeat(400);
  const parsed = script({
    title: "Long",
    mechanics,
    subject,
    scenes: Array.from({ length: 5 }, () => ({
      purpose: "Beat",
      seconds: 3,
      voiceover: "y".repeat(300),
      visual: long,
      camera: "z".repeat(120),
      onScreenText: "w".repeat(80),
    })),
  });
  if (!("data" in parsed)) {
    check("a long script parses", false, parsed.reason);
  } else {
    const compiled = compileScript(parsed.data);
    check(
      "a long script is still sendable",
      compiled.prompt.length <= 2000,
      `${compiled.prompt.length} chars`,
    );
    check("every scene still has a beat", compiled.shots.length === 5);
    // The point of shortening every scene rather than cutting the string: the
    // last beat, which is where the payoff lives, has to survive.
    check(
      "the last scene survives shortening",
      compiled.prompt.split("SCENE BEAT").length - 1 === 5 &&
        compiled.prompt.trimEnd().endsWith('"'),
      `${compiled.prompt.split("SCENE BEAT").length - 1} scenes present`,
    );
  }
}

{
  const beats = [
    { prompt: "She looks up", duration: 3 },
    { prompt: "The order fails", duration: 4 },
  ];

  const kling = foldShots(beats, "kling-3.0/video");
  check("a model that cuts keeps its beats", kling.shots?.length === 2 && kling.notice === null);

  const veo = foldShots(beats, "veo3_fast");
  check("a model that cannot cut sends no beats", veo.shots === undefined);
  check("the beats become direction instead", veo.addendum.includes("She looks up"));
  check("and the change is said out loud", veo.notice !== null);

  const none = foldShots(undefined, "veo3_fast");
  check("no beats stays no beats", none.shots === undefined && none.addendum === "");
}

{
  const beat = (label: string, detail: string) => ({ label, timing: "0:00-0:03", detail });
  const parsed = briefSchema.safeParse({
    hook: "Nobody tells you this about a bakery website",
    titles: ["The bakery website nobody warns you about"],
    beats: [beat("Hook", "She looks up from the counter"), beat("Payoff", "The orders come in")],
    durationSeconds: 15,
    hashtags: ["bakery"],
  });
  check("a brief parses", parsed.success, parsed.success ? "" : parsed.error.issues[0]?.message);
  if (parsed.success) {
    const compiled = compileBrief(parsed.data);
    check("the hook opens the compiled brief", compiled.includes(parsed.data.hook));
    check("the beats travel with the brief", compiled.includes("She looks up from the counter"));
    check("and so does the payoff", compiled.includes("The orders come in"));
    check("the compiled brief is sendable", compiled.length <= 2000);
  }
}

{
  // Beats too long to fit at all still compile to something sendable: the
  // header survives and every beat gives up an equal share of its detail.
  const parsed = briefSchema.safeParse({
    hook: "Hook",
    titles: ["Title"],
    beats: Array.from({ length: 6 }, () => ({
      label: "Beat",
      timing: "0:00-0:03",
      detail: "d".repeat(400),
    })),
    durationSeconds: 15,
    hashtags: [],
  });
  check("a wordy brief parses", parsed.success);
  if (parsed.success) {
    const compiled = compileBrief(parsed.data);
    check(
      "a brief with no room for beats is still sendable",
      compiled.length <= 2000,
      `${compiled.length} chars`,
    );
    check("the header still opens it", compiled.startsWith("A 15 second"));
  }
}

{
  // Regression: lastIndexOf("}") picked up a brace from trailing prose after
  // the real JSON, breaking a reply whose JSON was fine on its own.
  const clean = parseJsonReply(
    `{"hook":"h","titles":["t"],"beats":[{"label":"Hook","timing":"0:00-0:03","detail":"d"},{"label":"Payoff","timing":"0:10-0:15","detail":"d"}],"durationSeconds":15,"hashtags":[]}`,
    briefSchema,
  );
  check("a bare JSON reply still parses", "data" in clean);

  const trailingProse = parseJsonReply(
    `Here you go: {"hook":"h","titles":["t"],"beats":[{"label":"Hook","timing":"0:00-0:03","detail":"d"},{"label":"Payoff","timing":"0:10-0:15","detail":"d"}],"durationSeconds":15,"hashtags":[]} Let me know if that fits the brief {you asked for}.`,
    briefSchema,
  );
  check(
    "trailing prose with its own } does not break the parse",
    "data" in trailingProse,
    "data" in trailingProse ? "" : trailingProse.reason,
  );

  const quotedBrace = parseJsonReply(
    `{"hook":"a curly brace looks like this: }","titles":["t"],"beats":[{"label":"Hook","timing":"0:00-0:03","detail":"d"},{"label":"Payoff","timing":"0:10-0:15","detail":"d"}],"durationSeconds":15,"hashtags":[]}`,
    briefSchema,
  );
  check(
    "a } inside a quoted string is not mistaken for the close",
    "data" in quotedBrace && quotedBrace.data.hook.includes("}"),
  );
}

// `process.stdout` rather than `console`, matching the sibling smoke scripts
// and the lint rule that keeps `console` for warnings and errors.
process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
