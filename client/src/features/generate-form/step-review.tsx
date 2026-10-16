"use client";

import { type Route } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { quoteScene, startScene } from "@/features/studio/assist-actions";
import { createEditorProject } from "@/features/studio/actions";
import { quoteAvatarVideoScript, startAvatarVideo } from "@/features/live-avatar/avatar-video-actions";

import type { GenerateFormValues } from "./types";

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
  const avatarScript = buildAvatarScript(values);
  const prompt = values.avatarId !== "" ? avatarScript : buildPrompt(values);
  const promptLength = Array.from(prompt).length;

  useEffect(() => {
    let cancelled = false;
    setCredits(null);
    setQuoteError(null);
    if (values.avatarId !== "" && avatarScript.trim() === "") return;
    const quote = values.avatarId !== ""
      ? quoteAvatarVideoScript(avatarScript)
      : quoteScene(values.seconds);
    void quote.then((cost) => {
      if (cancelled) return;
      setCredits(cost);
      if (cost === null) setQuoteError("Could not estimate the generation cost. Please try again.");
    }).catch(() => {
      if (!cancelled) setQuoteError("Something went wrong while checking the cost. Please try again.");
    });
    return () => {
      cancelled = true;
    };
  }, [values.seconds, values.avatarId, avatarScript, quoteAttempt]);

  async function generate() {
    setConfirming(false);
    setError(null);
    setStarting(true);
    try {
      let jobId: string;
      if (values.avatarId !== "") {
        const result = await startAvatarVideo({ avatarId: values.avatarId, script: prompt, idempotencyKey: crypto.randomUUID() });
        if (result.status !== "ok") {
          setError(result.status === "unconfigured" ? "Avatar video generation is not available right now." : result.message);
          return;
        }
        jobId = result.job.id;
      } else {
        const result = await startScene({
          prompt,
          seconds: values.seconds,
          key: crypto.randomUUID(),
          aspectRatio: values.aspectRatio,
          sound: values.dialogue.trim() !== "",
          notifyEmail: values.notifyEmail,
          ...(values.firstFrameId !== "" ? { imageMediaId: values.firstFrameId } : {}),
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        jobId = result.jobId;
      }
      const project = await createEditorProject({
        title: values.objective.trim() || (values.avatarId ? "Avatar video" : "New video"),
        generation: values.avatarId !== ""
          ? { jobId, script: prompt, state: "running", generator: "avatar", avatarId: values.avatarId }
          : {
              jobId,
              script: prompt,
              state: "running",
              generator: "kie",
              seconds: values.seconds,
              aspectRatio: values.aspectRatio,
              sound: values.dialogue.trim() !== "",
              notifyEmail: values.notifyEmail,
              ...(values.firstFrameId ? { imageMediaId: values.firstFrameId } : {}),
            },
      });
      if (!project.ok) {
        setError(project.message);
        return;
      }
      router.push(`/editor/${project.value}?job=${jobId}&script=${encodeURIComponent(prompt)}` as Route);
    } catch {
      setError("Something went wrong while starting generation. Your project is still safe; please try again.");
    } finally {
      setStarting(false);
    }
  }

  const rows: ReadonlyArray<[string, string]> = [
    ["Objective", values.objective || "—"],
    ["Purpose & audience", [values.purpose, values.audience].filter(Boolean).join(" · ") || "—"],
    ["Format", values.avatarId !== "" ? `Saved avatar · ${Math.max(1, Math.ceil(Array.from(avatarScript).length / 15))}s estimate` : `${values.platform} · ${values.aspectRatio} · ${values.seconds}s`],
    ["Generator", values.avatarId !== "" ? "HeyGen avatar video" : "KIE Kling 3.0 video"],
    ["Script", values.avatarId !== "" ? avatarScript || "Add dialogue or narration" : values.hook !== "" ? values.hook : values.scenes.slice(0, 80)],
    ["Speech", `${values.language} · ${values.tone}`],
    ["Assets", values.avatarId !== "" ? "Saved avatar" : values.firstFrameId !== "" ? "First frame attached" : "None"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-2 rounded-2xl border border-hairline bg-paper p-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <dt className="w-20 shrink-0 font-medium text-ink-soft">{label}</dt>
            <dd className="min-w-0 flex-1 truncate text-ink">{value !== "" ? value : "—"}</dd>
          </div>
        ))}
        <div className="flex gap-3 border-t border-hairline pt-2 text-sm">
          <dt className="w-20 shrink-0 font-medium text-ink-soft">Cost</dt>
          <dd className="min-w-0 flex-1 text-ink">
            {credits === null ? (
              values.avatarId !== "" && avatarScript === "" ? "Add avatar dialogue to estimate" : "Estimating…"
            ) : (
              <>
                <span className="font-semibold tabular-nums">{credits} credits</span>
                {balance !== null ? <span className="text-ink-soft"> · {balance} available</span> : null}
              </>
            )}
          </dd>
        </div>
      </dl>

      {quoteError ? (
        <p role="alert" className="text-sm text-destructive">
          {quoteError} <button type="button" onClick={() => setQuoteAttempt((attempt) => attempt + 1)} className="font-medium underline underline-offset-2">Retry estimate</button>
        </p>
      ) : null}

      {values.avatarId === "" ? (
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
            if (values.avatarId !== "" && prompt.trim() === "") {
              setError("Add dialogue or narration for your avatar before generating.");
              return;
            }
            if (promptLength > 2500) {
              setError("This prompt is over 2,500 characters. Shorten the script before generating.");
              return;
            }
            setConfirming(true);
          }}
          disabled={credits === null || quoteError !== null}
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

function buildPrompt(values: GenerateFormValues): string {
  const parts = [
    values.objective !== "" ? `Objective: ${values.objective}` : "",
    values.purpose !== "" ? `Purpose: ${values.purpose}` : "",
    values.audience !== "" ? `Target audience: ${values.audience}` : "",
    values.platform !== "" ? `Format for ${values.platform}` : "",
    values.country !== "" ? `Market: ${values.country}` : "",
    values.visualStyle,
    values.contentKind !== "" ? `${values.contentKind} video` : "",
    values.hook !== "" ? `Opens with: ${values.hook}` : "",
    values.scenes,
    values.dialogue !== "" ? `Says: ${values.dialogue}` : "",
    values.language !== "" ? `In ${values.language}` : "",
    values.tone !== "" ? `Tone: ${values.tone}` : "",
    values.cta !== "" ? `Ends with: ${values.cta}` : "",
    values.product !== "" ? `Featuring: ${values.product}` : "",
    values.music !== "" ? `Music: ${values.music}` : "",
  ];
  return parts.map((part) => part.trim()).filter((part) => part !== "").join("\n");
}

function buildAvatarScript(values: GenerateFormValues): string {
  return [values.hook, values.dialogue, values.cta].map((part) => part.trim()).filter(Boolean).join("\n");
}
