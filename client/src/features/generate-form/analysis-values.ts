import type { AnalysisContent } from "../new-video/actions";

import { fromSuggestion } from "./audience.ts";
import { CTA_OPTIONS } from "./options.ts";
import { recommendedLength, spokenText } from "./pacing.ts";
import { EMPTY_FORM, MAX_TURNS, newTurn, type GenerateFormValues } from "./types.ts";

/** The first sentence of the reference's summary, kept short enough to read as a one-line goal. */
function objectiveFrom(analysis: AnalysisContent): string {
  const sentence = analysis.summary.trim().split(/(?<=[.!?])\s/u)[0] ?? "";
  return sentence.length > 120 ? `${sentence.slice(0, 117).trimEnd()}...` : sentence;
}

/**
 * What the form takes from an analysis. Only what the person has not already
 * typed is filled in, so a script that lands late never overwrites their words.
 */
export function valuesFromAnalysis(current: GenerateFormValues, analysis: AnalysisContent): Partial<GenerateFormValues> {
  const main = analysis.scenes.map((scene, index) => `Scene ${index + 1}: ${scene.visual}`).join("\n\n");
  const cta = current.cta !== "" ? current.cta : (CTA_OPTIONS[0]?.value ?? "");
  const spoken = spokenText({ dialogue: analysis.voiceover, cta });
  return {
    objective: current.objective.trim() !== "" ? current.objective : objectiveFrom(analysis),
    hook: current.hook !== "" ? current.hook : analysis.hook,
    scenes: current.scenes !== "" ? current.scenes : main,
    dialogue: current.dialogue !== "" ? current.dialogue : analysis.voiceover,
    cta,
    visualStyle: current.visualStyle !== "" ? current.visualStyle : analysis.style,
    audience: analysis.audience ? fromSuggestion(analysis.audience) : current.audience,
    seconds: current.seconds === EMPTY_FORM.seconds ? recommendedLength(spoken, "") : current.seconds,
    ...(analysis.speakers > 1 && current.speakerMode === "single"
      ? { speakerMode: "conversation" as const, turns: Array.from({ length: Math.min(analysis.speakers, MAX_TURNS) }, newTurn) }
      : {}),
  };
}
