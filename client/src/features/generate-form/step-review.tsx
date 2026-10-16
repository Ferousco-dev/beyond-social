"use client";

import { type Route } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { quoteScene, startScene } from "@/features/studio/assist-actions";
import { createEditorProject } from "@/features/studio/actions";

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

  useEffect(() => {
    let cancelled = false;
    void quoteScene(values.seconds).then((cost) => {
      if (!cancelled) setCredits(cost);
    });
    return () => {
      cancelled = true;
    };
  }, [values.seconds]);

  const prompt = buildPrompt(values);

  async function generate() {
    setConfirming(false);
    setError(null);
    setStarting(true);
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
      setStarting(false);
      setError(result.message);
      return;
    }
    const project = await createEditorProject({
      title: values.objective.trim() || "New video",
      generation: { jobId: result.jobId, script: prompt, state: "running" },
    });
    setStarting(false);
    if (!project.ok) {
      setError(project.message);
      return;
    }
    router.push(`/editor/${project.value}?job=${result.jobId}&script=${encodeURIComponent(prompt)}` as Route);
  }

  const rows: ReadonlyArray<[string, string]> = [
    ["Objective", `${values.purpose || "—"} · ${values.audience || "—"}`],
    ["Format", `${values.platform} · ${values.aspectRatio} · ${values.seconds}s`],
    ["Script", values.hook !== "" ? values.hook : values.scenes.slice(0, 80)],
    ["Speech", `${values.language} · ${values.tone}`],
    ["Assets", values.firstFrameId !== "" ? "First frame attached" : "None"],
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
              "Estimating…"
            ) : (
              <>
                <span className="font-semibold tabular-nums">{credits} credits</span>
                {balance !== null ? <span className="text-ink-soft"> · {balance} available</span> : null}
              </>
            )}
          </dd>
        </div>
      </dl>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={values.notifyEmail}
          onChange={(event) => onChange({ notifyEmail: event.target.checked })}
          className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
        />
        Email me when the video is ready
      </label>

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
            setConfirming(true);
          }}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90"
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
    values.visualStyle,
    values.contentKind !== "" ? `${values.contentKind} video` : "",
    values.hook !== "" ? `Opens with: ${values.hook}` : "",
    values.scenes,
    values.dialogue !== "" ? `Says: ${values.dialogue}` : "",
    values.language !== "" ? `In ${values.language}` : "",
    values.tone !== "" ? `Tone: ${values.tone}` : "",
    values.cta !== "" ? `Ends with: ${values.cta}` : "",
    values.product !== "" ? `Featuring: ${values.product}` : "",
  ];
  return parts.map((part) => part.trim()).filter((part) => part !== "").join("\n");
}
