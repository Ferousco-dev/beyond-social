"use client";

import { useState, useTransition } from "react";

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
}: {
  onSkip: () => void;
  onUse: (brief: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("start");
  const [idea, setIdea] = useState("");
  const [analysis, setAnalysis] = useState<IdeaAnalysis | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
      setStage("refine");
    });
  }

  function generate() {
    if (analysis === null) return;
    setNotice(null);

    startTransition(async () => {
      const result = await buildBriefAction({ idea, analysis, answers });

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

  function restart() {
    setStage("start");
    setIdea("");
    setAnalysis(null);
    setAnswers({});
    setBrief(null);
    setNotice(null);
  }

  return (
    <div className="w-full">
      {stage === "start" ? <StartScreen onRefine={() => setStage("idea")} onSkip={onSkip} /> : null}

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
          onAnswer={(label, option) => setAnswers((current) => ({ ...current, [label]: option }))}
          onBack={() => setStage("idea")}
          onSubmit={generate}
          pending={pending}
        />
      ) : null}

      {stage === "brief" && brief !== null ? (
        <ContentBriefView brief={brief} onRestart={restart} onUse={() => onUse(brief.prompt)} />
      ) : null}

      {notice ? (
        <p role="status" className="mx-auto mt-6 max-w-2xl text-center text-sm text-destructive">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
