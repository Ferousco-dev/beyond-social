"use client";

import { useState, useTransition } from "react";

import { compileBrief } from "@/lib/brief/compile";
import { type ContentBrief, type IdeaAnalysis } from "@/lib/brief/schema";

import { analyseIdeaAction, buildBriefAction } from "../actions";
import { ContentBriefView } from "./content-brief-view";
import { IdeaInput } from "./idea-input";
import { IdeaRefiner } from "./idea-refiner";
import { StartScreen } from "./start-screen";

/**
 * The route from "I want to make something" to a brief.
 *
 * Four screens, one at a time, each one only asking for what it needs. The state
 * lives here rather than in the URL because a half-refined idea is not something
 * worth linking to, and losing it on a back button would be worse than losing it
 * on a refresh.
 */

type Stage = "start" | "idea" | "refine" | "brief";

export function BriefFlow({
  onSkip,
  onUse,
  recents = [],
}: {
  onSkip: () => void;
  onUse: (brief: string) => void;
  recents?: readonly { id: string; title: string }[];
}) {
  const [stage, setStage] = useState<Stage>("start");
  const [idea, setIdea] = useState("");
  const [analysis, setAnalysis] = useState<IdeaAnalysis | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  /** Questions the user declined. Left out of the brief rather than guessed. */
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function analyse() {
    setNotice(null);
    startTransition(async () => {
      const result = await analyseIdeaAction({ idea });

      if (result.status === "unconfigured") {
        setNotice("The idea refiner is not connected on this deployment.");
        return;
      }
      if (result.status === "error") {
        setNotice(result.message);
        return;
      }

      setAnalysis(result.analysis);
      // Cleared rather than kept: the questions are generated per idea, so
      // answers from a previous run belong to questions that no longer exist.
      setAnswers({});
      setSkipped(new Set());

      /*
       * No questions is a valid outcome, not a dead end. The model may have had
       * nothing worth asking, or the few it asked may all have been malformed
       * and dropped. Either way the refining step has nothing to show, and
       * stopping on an empty screen would be worse than simply writing the
       * brief, which is what the questions were only ever there to sharpen.
       */
      if (result.analysis.questions.length === 0) {
        generateFrom(result.analysis, {});
        return;
      }

      setStage("refine");
    });
  }

  /**
   * Writes the brief from an explicit analysis and set of answers.
   *
   * Takes both as arguments rather than reading state, so it can be called in
   * the same tick the analysis arrives: `setAnalysis` has not landed yet at that
   * point, and reading state would send the previous idea's analysis or none.
   */
  function generateFrom(from: IdeaAnalysis, chosen: Readonly<Record<string, string>>) {
    setNotice(null);

    startTransition(async () => {
      const result = await buildBriefAction({ idea, analysis: from, answers: chosen });

      if (result.status === "unconfigured") {
        setNotice("The idea refiner is not connected on this deployment.");
        return;
      }
      if (result.status === "error") {
        setNotice(result.message);
        return;
      }

      setBrief(result.brief);
      setStage("brief");
    });
  }

  function generate() {
    if (analysis === null) return;
    generateFrom(analysis, answers);
  }

  function restart() {
    setStage("start");
    setIdea("");
    setAnalysis(null);
    setAnswers({});
    setSkipped(new Set());
    setBrief(null);
    setNotice(null);
  }

  return (
    <div className="w-full">
      {stage === "start" ? (
        <StartScreen onRefine={() => setStage("idea")} onSkip={onSkip} recents={recents} />
      ) : null}

      {stage === "idea" ? (
        <IdeaInput
          value={idea}
          onChange={setIdea}
          onBack={() => setStage("start")}
          onSubmit={analyse}
          pending={pending}
        />
      ) : null}

      {stage === "refine" && analysis !== null ? (
        <IdeaRefiner
          analysis={analysis}
          answers={answers}
          skipped={skipped}
          onAnswer={(label, option) => setAnswers((current) => ({ ...current, [label]: option }))}
          onSkip={(label) => setSkipped((current) => new Set(current).add(label))}
          onBack={() => setStage("idea")}
          onSubmit={generate}
          pending={pending}
        />
      ) : null}

      {stage === "brief" && brief !== null ? (
        <ContentBriefView
          brief={brief}
          onRestart={restart}
          onUse={() => onUse(compileBrief(brief))}
        />
      ) : null}

      {notice ? (
        <p role="alert" className="mx-auto mt-6 max-w-2xl text-center text-sm text-destructive">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
