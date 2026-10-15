"use client";

import { useEffect, useState } from "react";

import { readAnalysis, startAnalysis, type AnalysisContent } from "../actions";

const POLL_MS = 3_000;

/** Phase 2: watch the analysis land, then shape the suggested script. */
export function AnalysisView({
  url,
  context,
  onBack,
}: {
  url: string;
  context: string;
  onBack: () => void;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [state, setState] = useState<string>("queued");
  const [analysis, setAnalysis] = useState<AnalysisContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startAnalysis({ url, idempotencyKey: crypto.randomUUID() }).then((result) => {
      if (cancelled) return;
      if (result.status !== "ok") {
        setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
        return;
      }
      setJobId(result.job.id);
      setState(result.job.state);
      if (result.job.analysis) setAnalysis(result.job.analysis);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!jobId || analysis || error) return;
    if (state !== "queued" && state !== "running") return;
    const timer = window.setTimeout(() => {
      void readAnalysis(jobId).then((result) => {
        if (result.status !== "ok") {
          setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
          return;
        }
        setState(result.job.state);
        if (result.job.analysis) {
          setAnalysis(result.job.analysis);
        } else if (result.job.state === "failed") {
          setError(result.job.error ?? "The analysis failed.");
        }
      });
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [jobId, analysis, error, state]);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <BackButton onBack={onBack} />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-start gap-3" aria-live="polite">
        <p className="text-sm text-ink-soft">
          {state === "running" ? "Watching the video…" : "Queued for analysis…"}
        </p>
        <BackButton onBack={onBack} />
      </div>
    );
  }

  return (
    <ScriptEditor analysis={analysis} context={context} approved={approved} onApprove={() => setApproved(true)} onBack={onBack} />
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud"
    >
      Back to results
    </button>
  );
}

const ATTRIBUTES: ReadonlyArray<{ label: string; key: "mood" | "style" | "pacing" }> = [
  { label: "Mood", key: "mood" },
  { label: "Style", key: "style" },
  { label: "Pacing", key: "pacing" },
];

function ScriptEditor({
  analysis,
  context,
  approved,
  onApprove,
  onBack,
}: {
  analysis: AnalysisContent;
  context: string;
  approved: boolean;
  onApprove: () => void;
  onBack: () => void;
}) {
  const [hook, setHook] = useState(analysis.hook);
  const [main, setMain] = useState(analysis.scenes.map((scene) => scene.visual).join("\n"));
  const [dialogue, setDialogue] = useState(analysis.voiceover);
  const [cta, setCta] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-hairline bg-paper p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">Reference analysis · {context}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{analysis.summary}</p>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {ATTRIBUTES.map(({ label, key }) => (
            <div key={key} className="rounded-xl bg-cloud/60 px-3 py-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</dt>
              <dd className="mt-0.5 truncate text-sm text-ink">{analysis[key] !== "" ? analysis[key] : "—"}</dd>
            </div>
          ))}
        </dl>
        {analysis.whyItWorks !== "" ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">Why it works: {analysis.whyItWorks}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink">Suggested script, inspired by the reference, written fresh</h3>
        {(
          [
            { label: "Opening hook", value: hook, onChange: setHook, rows: 2 },
            { label: "Main content", value: main, onChange: setMain, rows: 5 },
            { label: "Dialogue or narration", value: dialogue, onChange: setDialogue, rows: 4 },
            { label: "Call to action", value: cta, onChange: setCta, rows: 2 },
          ] as const
        ).map((field) => (
          <label key={field.label} className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            {field.label}
            <textarea
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              rows={field.rows}
              disabled={approved}
              className="w-full rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm font-normal leading-relaxed text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:opacity-70"
            />
          </label>
        ))}
      </div>

      {approved ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="rounded-xl border border-hairline bg-paper p-3 text-sm text-ink">
            Script approved. The main generation page lands in the next milestone and picks it up from here.
          </p>
          <BackButton onBack={onBack} />
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Approve script
          </button>
          <BackButton onBack={onBack} />
        </div>
      )}
    </div>
  );
}
