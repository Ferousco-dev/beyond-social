"use client";

import { useEffect, useState } from "react";

import { preloadLibrary } from "@/features/asset-library/use-library";
import { cn } from "@/lib/utils";

import { fromSuggestion, toAudience } from "./audience";
import { StepAssets } from "./step-assets";
import { StepFormat } from "./step-format";
import { StepObjective } from "./step-objective";
import { StepReview } from "./step-review";
import { StepScript } from "./step-script";
import { toLength } from "./pacing";
import { CONTENT_KINDS, EMPTY_FORM, MAX_TURNS, STEPS, newTurn, type GenerateFormValues } from "./types";
import type { ApprovedScript } from "@/features/new-video/approved-script";
import type { OwnIdea } from "@/features/new-video/components/own-idea-panel";

export const DRAFT_KEY = "bs:generate-draft";
const IDEA_KEY = "bs:own-idea";
const SCRIPT_KEY = "bs:approved-script";

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** The 5-step generation form. Prefills from the New Video flow, autosaves. */
export function GenerateFormShell({ balance }: { balance: number | null }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<GenerateFormValues>(EMPTY_FORM);

  function handleContinue(): void {
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  // Saved assets are read now, so the Visual assets step opens without waiting.
  useEffect(() => preloadLibrary(), []);

  // Prefill once: the own-idea brief, then the approved analysis script.
  useEffect(() => {
    const saved = readJSON<GenerateFormValues>(DRAFT_KEY);
    if (saved) {
      setValues({
        ...EMPTY_FORM,
        ...saved,
        purpose: saved.purpose || EMPTY_FORM.purpose,
        audience: toAudience(saved.audience),
        seconds: toLength(saved.seconds),
        contentKind: CONTENT_KINDS.find((kind) => kind.toLowerCase() === saved.contentKind?.toLowerCase()) ?? EMPTY_FORM.contentKind,
      });
      return;
    }
    const idea = readJSON<OwnIdea>(IDEA_KEY);
    const script = readJSON<ApprovedScript>(SCRIPT_KEY);
    if (!idea && !script) return;
    setValues((current) => ({
      ...current,
      objective: idea?.objective ?? current.objective,
      audience: script?.audience ? fromSuggestion(script.audience) : idea ? toAudience(idea.audience) : current.audience,
      product: idea?.product ?? current.product,
      visualStyle: idea?.style ?? script?.style ?? current.visualStyle,
      hook: script?.hook ?? current.hook,
      scenes: script?.main ?? current.scenes,
      dialogue: script?.dialogue ?? current.dialogue,
      cta: script?.cta ?? current.cta,
      seconds: script?.seconds ?? current.seconds,
      ...(script?.speakers !== undefined && script.speakers > 1
        ? { speakerMode: "conversation" as const, turns: Array.from({ length: Math.min(script.speakers, MAX_TURNS) }, newTurn) }
        : {}),
    }));
  }, []);

  // Autosave every change; the job itself persists server-side.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      // Private browsing: the form still works for this session.
    }
  }, [values]);

  function patch(next: Partial<GenerateFormValues>): void {
    setValues((current) => ({ ...current, ...next }));
  }

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Progress" className="flex gap-1.5">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={index === step ? "step" : undefined}
              className="group w-full cursor-pointer py-1 text-left"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-colors",
                  index <= step ? "bg-primary" : "bg-hairline group-hover:bg-cloud",
                )}
              />
              <span className={cn("mt-1.5 hidden text-[11px] sm:block", index === step ? "font-medium text-ink" : "text-ink-soft")}>
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <h2 className="text-lg font-semibold text-ink">{STEPS[step]}</h2>

      {step === 0 ? <StepObjective values={values} onChange={patch} /> : null}
      {step === 1 ? <StepFormat values={values} onChange={patch} /> : null}
      {step === 2 ? <StepScript values={values} onChange={patch} /> : null}
      {step === 3 ? <StepAssets values={values} onChange={patch} /> : null}
      {step === 4 ? <StepReview values={values} balance={balance} onChange={patch} /> : null}

      <div className="flex gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-80"
          >
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
