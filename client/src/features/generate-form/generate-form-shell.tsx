"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { StepAssets } from "./step-assets";
import { StepFormat } from "./step-format";
import { StepObjective } from "./step-objective";
import { StepReview } from "./step-review";
import { StepScript } from "./step-script";
import { EMPTY_FORM, STEPS, type GenerateFormValues } from "./types";
import type { ApprovedScript } from "@/features/new-video/components/analysis-view";
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

  // Prefill once: the own-idea brief, then the approved analysis script.
  useEffect(() => {
    const saved = readJSON<GenerateFormValues>(DRAFT_KEY);
    if (saved) {
      setValues({ ...EMPTY_FORM, ...saved });
      return;
    }
    const idea = readJSON<OwnIdea>(IDEA_KEY);
    const script = readJSON<ApprovedScript>(SCRIPT_KEY);
    if (!idea && !script) return;
    setValues((current) => ({
      ...current,
      objective: idea?.objective ?? current.objective,
      audience: idea?.audience ?? current.audience,
      product: idea?.product ?? current.product,
      visualStyle: idea?.style ?? current.visualStyle,
      hook: script?.hook ?? current.hook,
      scenes: script?.main ?? current.scenes,
      dialogue: script?.dialogue ?? current.dialogue,
      cta: script?.cta ?? current.cta,
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
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud"
          >
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
