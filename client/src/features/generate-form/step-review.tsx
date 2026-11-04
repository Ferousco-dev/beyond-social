"use client";

import { type Route } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createEditorProject } from "@/features/studio/actions";

import { buildAvatarScript } from "./brief";
import { PacingNote } from "./length-picker";
import { fits, spokenText } from "./pacing";
import { ReviewSummary } from "./review-summary";
import { quoteGeneration, scriptOf, startGeneration, videoKind } from "./start-generation";
import { turnsReady, type GenerateFormValues } from "./types";

/** Step E: review, credit estimate, confirm, progress, done. */
export function StepReview({
  values,
  balance,
  onChange,
}: {
  values: GenerateFormValues;
  balance: number | null;
  onChange: (patch: Partial<GenerateFormValues>) => void;
}) {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const kind = videoKind(values);
  const prompt = scriptOf(values);
  const avatarScript = buildAvatarScript(values);
  const promptLength = Array.from(prompt).length;
  // A clip has a fixed length, so speech that does not fit would be rushed.
  const rushed = kind === "clip" && !fits(spokenText(values), values.seconds);
  const missingWords =
    kind === "conversation" ? !turnsReady(values.turns) : kind === "talking" && avatarScript.trim() === "";
  // Re-quote only when something that changes the price changes.
  const quoteKey = kind === "clip" ? `clip:${values.seconds}` : prompt;

  useEffect(() => {
    let cancelled = false;
    setCredits(null);
    setQuoteError(null);
    if (missingWords) return;
    void quoteGeneration(values)
      .then((cost) => {
        if (cancelled) return;
        setCredits(cost);
        if (cost === null) setQuoteError("Could not estimate the generation cost. Please try again.");
      })
      .catch(() => {
        if (!cancelled) setQuoteError("Something went wrong while checking the cost. Please try again.");
      });
    return () => {
      cancelled = true;
    };
    // values is read through quoteKey; re-quoting on every keystroke elsewhere would be wasted calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, missingWords, quoteAttempt]);

  async function generate() {
    setConfirming(false);
    setError(null);
    setStarting(true);
    try {
      const started = await startGeneration(values);
      if (!started.ok) {
        setError(started.message);
        return;
      }
      const { generation } = started;
      const project = await createEditorProject({
        title: values.objective.trim() || (kind === "conversation" ? "Conversation" : kind === "talking" ? "Talking video" : "New video"),
        generation,
      });
      if (!project.ok) {
        setError(project.message);
        return;
      }
      router.push(`/editor/${project.value}?job=${generation.jobId}&script=${encodeURIComponent(prompt)}` as Route);
    } catch {
      setError("Something went wrong while starting generation. Your project is still safe; please try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ReviewSummary values={values} avatarScript={avatarScript} credits={credits} balance={balance} />

      {quoteError ? (
        <p role="alert" className="text-sm text-destructive">
          {quoteError} <button type="button" onClick={() => setQuoteAttempt((attempt) => attempt + 1)} className="font-medium underline underline-offset-2">Retry estimate</button>
        </p>
      ) : null}

      {kind === "clip" ? (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={values.notifyEmail}
            onChange={(event) => onChange({ notifyEmail: event.target.checked })}
            className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
          />
          Email me when the video is ready
        </label>
      ) : null}

      {rushed ? <PacingNote spoken={spokenText(values)} seconds={values.seconds} onPick={(seconds) => onChange({ seconds })} /> : null}

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary bg-paper p-4" role="alertdialog" aria-label="Confirm generation">
          <p className="text-sm text-ink">
            Start generation for <span className="font-semibold tabular-nums">{credits ?? "…" } credits</span>?
            {balance !== null ? ` You have ${balance}.` : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={starting}
              className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {starting ? "Opening editor…" : "Confirm and generate"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={starting}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            if (missingWords) {
              setError(kind === "conversation" ? "Give every turn a face, a voice and its words before generating." : "Add the words your voice recording says before generating.");
              return;
            }
            if (promptLength > 2500) {
              setError("This prompt is over 2,500 characters. Shorten the script before generating.");
              return;
            }
            setConfirming(true);
          }}
          disabled={credits === null || quoteError !== null || rushed}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review and generate
        </button>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
