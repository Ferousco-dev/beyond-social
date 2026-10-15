"use client";

import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clapperboard,
  LoaderCircle,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { adoptVideo, quoteScene, startScene } from "@/features/studio/assist-actions";
import { type TwinSummary } from "@/features/live-avatar/delete-actions";
import { getVideoJob } from "@/features/transform/actions";
import { useJobSocket } from "@/lib/go-api/use-job-socket";
import { isFinished, type JobView } from "@/lib/go-api/jobs";

const AUTOSAVE_DELAY_MS = 500;
const POLL_INTERVAL_MS = 6_000;
const SCENE_LIMIT = 4;
const PROMPT_LIMIT = 2_500;

const sceneSchema = z.object({
  visual: z.string().max(500),
  dialogue: z.string().max(400),
});

const draftSchema = z.object({
  objective: z.string().max(120),
  audience: z.string().max(300),
  offering: z.string().max(300),
  country: z.string().max(100),
  language: z.string().max(80),
  platform: z.enum(["TikTok", "Instagram Reels", "YouTube Shorts"]),
  durationSeconds: z.number().int().min(3).max(15),
  style: z.string().max(200),
  contentType: z.enum(["Human-led", "Product-focused", "Mixed"]),
  hook: z.string().max(250),
  scenes: z.array(sceneSchema).min(1).max(SCENE_LIMIT),
  voiceDirection: z.string().max(200),
  callToAction: z.string().max(250),
  music: z.string().max(200),
  avatarId: z.string(),
  productReference: z.string().max(300),
  backgroundReference: z.string().max(300),
  additionalAssets: z.string().max(300),
  rightsConfirmed: z.boolean(),
});

type GenerationDraft = z.infer<typeof draftSchema>;
type InitialBrief = {
  readonly source?: "idea" | "reference";
  readonly objective?: string;
  readonly audience?: string;
  readonly offering?: string;
  readonly country?: string;
  readonly style?: string;
  readonly hook?: string;
  readonly sceneVisual?: string;
};

const DEFAULT_DRAFT: GenerationDraft = {
  objective: "Promotion",
  audience: "",
  offering: "",
  country: "",
  language: "English",
  platform: "TikTok",
  durationSeconds: 10,
  style: "Natural, polished social video",
  contentType: "Human-led",
  hook: "",
  scenes: [{ visual: "", dialogue: "" }],
  voiceDirection: "",
  callToAction: "",
  music: "",
  avatarId: "",
  productReference: "",
  backgroundReference: "",
  additionalAssets: "",
  rightsConfirmed: false,
};

const savedDraftSchema = z.object({
  draft: draftSchema,
  step: z.number().int().min(0).max(4),
  jobId: z.string().uuid().nullable(),
});

const STEPS = [
  { title: "Objective", description: "What should this video achieve?" },
  { title: "Format", description: "Choose the platform and look." },
  { title: "Script & speech", description: "Shape the hook, scenes and message." },
  { title: "Visual assets", description: "Add visual guidance and saved characters." },
  { title: "Final review", description: "Check details and estimated credits." },
] as const;

const FIELD =
  "mt-1.5 min-h-11 w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const LABEL = "block text-sm font-medium text-ink";

function storageKey(scope: string): string {
  return `beyond-social:generation-draft:v1:${encodeURIComponent(scope.toLowerCase())}`;
}

function makePrompt(draft: GenerationDraft): string {
  const lines = [
    `Create a ${draft.durationSeconds}-second ${draft.platform} video scene in vertical 9:16 format.`,
    `Objective: ${draft.objective}.`,
    draft.audience ? `Target audience: ${draft.audience}.` : "",
    draft.offering ? `Product or service: ${draft.offering}.` : "",
    [draft.country, draft.language].filter(Boolean).length > 0
      ? `Target market and language: ${[draft.country, draft.language].filter(Boolean).join(", ")}.`
      : "",
    `Content: ${draft.contentType}. Visual style: ${draft.style}.`,
    draft.hook ? `Opening hook: ${draft.hook}.` : "",
    ...draft.scenes.flatMap((scene, index) => {
      const detail = [
        scene.visual ? `Visual: ${scene.visual}` : "",
        scene.dialogue ? `Dialogue or narration: ${scene.dialogue}` : "",
      ].filter(Boolean);
      return detail.length > 0 ? [`Scene ${index + 1}: ${detail.join(". ")}.`] : [];
    }),
    draft.voiceDirection ? `Voice direction: ${draft.voiceDirection}.` : "",
    draft.callToAction ? `Call to action: ${draft.callToAction}.` : "",
    draft.music ? `Music and sound: ${draft.music}.` : "",
    draft.avatarId ? "Use the selected saved character as visual reference if available." : "",
    draft.productReference ? `Product visual guidance: ${draft.productReference}.` : "",
    draft.backgroundReference ? `Background guidance: ${draft.backgroundReference}.` : "",
    draft.additionalAssets ? `Additional visual guidance: ${draft.additionalAssets}.` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

function stepIssues(step: number, draft: GenerationDraft): string[] {
  if (step === 0) {
    const required: readonly [string, string][] = [
      [draft.audience, "Add a target audience."],
      [draft.offering, "Describe the product or service."],
      [draft.country, "Add a target country."],
    ];
    return required.filter(([value]) => value.trim() === "").map(([, message]) => message);
  }
  if (step === 2) {
    if (draft.hook.trim() === "") return ["Add an opening hook."];
    if (draft.scenes.every((scene) => scene.visual.trim() === "")) {
      return ["Describe at least one scene."];
    }
  }
  if (step === 3 && !draft.rightsConfirmed) {
    return ["Confirm that you have permission to use the people and assets described."];
  }
  return [];
}

function formatStatus(job: JobView): string {
  if (job.status === "queued") return "Queued";
  if (job.status === "running") return job.stage || "Generating";
  if (job.status === "completed") return "Complete";
  if (job.status === "failed") return "Failed";
  return job.stage || job.status;
}

export function GenerationWizard({
  draftScope,
  credits,
  avatars,
  initialBrief,
}: {
  readonly draftScope: string;
  readonly credits: number | null;
  readonly avatars: readonly TwinSummary[];
  readonly initialBrief?: InitialBrief;
}): ReactNode {
  const [draft, setDraft] = useState<GenerationDraft>(DEFAULT_DRAFT);
  const [step, setStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [quote, setQuote] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [storageMessage, setStorageMessage] = useState("Saving draft on this device…");
  const [formError, setFormError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [adoptState, setAdoptState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [socketUp, setSocketUp] = useState(false);
  const hydrated = useRef(false);
  const adoptedJobId = useRef<string | null>(null);
  const attemptKey = useRef<string | null>(null);
  const key = useMemo(() => storageKey(draftScope), [draftScope]);

  const currentJobActive = job !== null && !isFinished(job);
  const scenePrompt = useMemo(() => makePrompt(draft), [draft]);
  const selectedAvatar = avatars.find((avatar) => avatar.id === draft.avatarId) ?? null;

  useEffect(() => {
    if (initialBrief?.source) {
      setDraft({
        ...DEFAULT_DRAFT,
        objective: initialBrief.objective ?? DEFAULT_DRAFT.objective,
        audience: initialBrief.audience ?? DEFAULT_DRAFT.audience,
        offering: initialBrief.offering ?? DEFAULT_DRAFT.offering,
        country: initialBrief.country ?? DEFAULT_DRAFT.country,
        style: initialBrief.style ?? DEFAULT_DRAFT.style,
        hook: initialBrief.hook ?? DEFAULT_DRAFT.hook,
        scenes: [{ visual: initialBrief.sceneVisual ?? "", dialogue: "" }],
      });
      setStorageMessage("Brief loaded. Review and complete the generation details.");
      hydrated.current = true;
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const parsed = savedDraftSchema.safeParse(JSON.parse(raw) as unknown);
        if (parsed.success) {
          setDraft(parsed.data.draft);
          setStep(parsed.data.step);
          setJobId(parsed.data.jobId);
          setStorageMessage("Draft restored from this device.");
        } else {
          setStorageMessage("The saved draft could not be restored; a new draft is ready.");
        }
      } else {
        setStorageMessage("Draft autosaves on this device.");
      }
    } catch {
      setStorageMessage("Local draft storage is unavailable in this browser.");
    }
    hydrated.current = true;
  }, [initialBrief, key]);

  useEffect(() => {
    if (!hydrated.current) return;
    setStorageMessage("Saving draft on this device…");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ draft, step, jobId }));
        setStorageMessage("Draft saved on this device.");
      } catch {
        setStorageMessage("Could not save the draft in this browser.");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, jobId, key, step]);

  useEffect(() => {
    let active = true;
    setQuoting(true);
    setQuote(null);
    setQuoteError(null);
    void quoteScene(draft.durationSeconds)
      .then((amount) => {
        if (!active) return;
        if (amount === null) {
          setQuoteError("The credit estimate is unavailable. Retry the estimate before generating.");
          return;
        }
        setQuote(amount);
      })
      .catch(() => {
        if (active) setQuoteError("Could not load a credit estimate. Retry before generating.");
      })
      .finally(() => {
        if (active) setQuoting(false);
      });
    return () => {
      active = false;
    };
  }, [draft.durationSeconds]);

  const refreshJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const result = await getVideoJob(jobId);
      if (result.status === "ok") {
        setJob(result.job);
        setStatusError(null);
      } else {
        setStatusError(
          result.status === "error"
            ? `Could not refresh generation status: ${result.message}`
            : "The video service is not configured; retrying status check.",
        );
      }
    } catch {
      setStatusError(
        "Could not refresh generation status because of a connection problem. Retrying automatically.",
      );
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) void refreshJob();
  }, [jobId, refreshJob]);

  useJobSocket({
    jobId,
    active: currentJobActive,
    onUpdate: (update) => {
      setJob(update);
      setStatusError(null);
    },
    onResync: () => void refreshJob(),
    onConnection: setSocketUp,
  });

  useEffect(() => {
    if (!currentJobActive || socketUp) return;
    const timer = window.setInterval(() => void refreshJob(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [currentJobActive, refreshJob, socketUp]);

  useEffect(() => {
    if (!job || job.status !== "completed" || !job.resultUrl || adoptedJobId.current === job.id) {
      return;
    }
    adoptedJobId.current = job.id;
    setAdoptState("saving");
    void adoptVideo(job.id).then((result) => {
      if (result.ok) {
        setAdoptState("saved");
        setAdoptError(null);
        setJobId(null);
      } else {
        setAdoptState("failed");
        setAdoptError(result.message);
      }
    }).catch(() => {
      setAdoptState("failed");
      setAdoptError("The clip finished but could not be saved to your Library.");
    });
  }, [job]);

  function retryStatusOrSave(): void {
    if (job?.status === "completed" && adoptState === "failed") {
      adoptedJobId.current = null;
      setAdoptState("idle");
      setJob({ ...job });
      return;
    }
    void refreshJob();
  }

  function startAnotherScene(): void {
    attemptKey.current = null;
    adoptedJobId.current = null;
    setJob(null);
    setJobId(null);
    setAdoptState("idle");
    setAdoptError(null);
    setStatusError(null);
    setStep(4);
  }

  function update<K extends keyof GenerationDraft>(field: K, value: GenerationDraft[K]): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError(null);
  }

  function next(): void {
    const issues = stepIssues(step, draft);
    if (issues.length > 0) {
      setFormError(issues[0] ?? "Complete this step to continue.");
      return;
    }
    setFormError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goToStep(target: number): void {
    if (target >= step) return;
    setStep(target);
    setFormError(null);
  }

  async function generate(): Promise<void> {
    if (starting || jobId) return;
    if (quote === null || quoteError) {
      setFormError("A current credit estimate is required before generation.");
      setConfirmOpen(false);
      return;
    }
    if (credits === null) {
      setFormError("Your remaining credit balance is unavailable. Refresh the page and try again.");
      setConfirmOpen(false);
      return;
    }
    if (credits < quote) {
      setFormError("You do not have enough remaining credits for this generation.");
      setConfirmOpen(false);
      return;
    }
    if (!draft.rightsConfirmed) {
      setFormError("Confirm that you have permission to use the people and assets described.");
      setConfirmOpen(false);
      return;
    }
    if (scenePrompt.length > PROMPT_LIMIT) {
      setFormError(`Shorten the brief to ${PROMPT_LIMIT.toLocaleString("en-US")} characters or fewer.`);
      setConfirmOpen(false);
      return;
    }

    setStarting(true);
    setFormError(null);
    try {
      attemptKey.current ??= crypto.randomUUID();
      const result = await startScene({
        prompt: scenePrompt,
        seconds: draft.durationSeconds,
        key: attemptKey.current,
      });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      attemptKey.current = null;
      adoptedJobId.current = null;
      setJobId(result.jobId);
      setJob({
        id: result.jobId,
        status: "queued",
        stage: "queued",
        progress: 0,
        error: null,
        resultUrl: null,
      });
    } catch {
      setFormError("Could not start generation because of a connection problem. Your credits were not confirmed as charged.");
    } finally {
      setStarting(false);
      setConfirmOpen(false);
    }
  }

  const canGenerate =
    quote !== null &&
    !quoting &&
    !quoteError &&
    credits !== null &&
    credits >= quote &&
    draft.rightsConfirmed &&
    scenePrompt.length <= PROMPT_LIMIT &&
    !jobId;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Video studio</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
            Configure your video
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Work through five guided steps. Your draft saves automatically in this browser.
          </p>
        </div>
        <p className="shrink-0 text-xs text-ink-soft" aria-live="polite">
          {storageMessage}
        </p>
      </header>

      <nav aria-label="Video setup steps" className="my-6">
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
          {STEPS.map((item, index) => (
            <li key={item.title}>
              <button
                type="button"
                onClick={() => goToStep(index)}
                disabled={index > step}
                aria-current={index === step ? "step" : undefined}
                className={`w-full border-t-2 pt-2 text-left text-[11px] leading-tight transition-colors sm:text-xs ${
                  index <= step ? "border-primary text-ink" : "border-hairline text-ink-soft"
                } disabled:cursor-not-allowed`}
              >
                <span className="font-semibold">{String.fromCharCode(65 + index)}</span>
                <span className="hidden sm:inline"> · {item.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {job ? (
        <GenerationStatus
          job={job}
          statusError={statusError}
          adoptState={adoptState}
          adoptError={adoptError}
          onRetry={retryStatusOrSave}
          onStartOver={startAnotherScene}
        />
      ) : (
        <section aria-labelledby="step-title" className="rounded-2xl border border-hairline bg-paper p-4 sm:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
            Step {String.fromCharCode(65 + step)} of E
          </p>
          <h2 id="step-title" className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {STEPS[step]?.title}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{STEPS[step]?.description}</p>

          <div className="mt-6 space-y-5">
            {step === 0 ? (
              <ObjectiveFields draft={draft} update={update} />
            ) : null}
            {step === 1 ? (
              <FormatFields draft={draft} update={update} quote={quote} quoting={quoting} quoteError={quoteError} onRetryQuote={() => {
                setQuoteError(null);
                setQuote(null);
                setQuoting(true);
                void quoteScene(draft.durationSeconds)
                  .then((amount) => amount === null ? setQuoteError("The credit estimate is unavailable. Retry the estimate before generating.") : setQuote(amount))
                  .catch(() => setQuoteError("Could not load a credit estimate. Retry before generating."))
                  .finally(() => setQuoting(false));
              }} />
            ) : null}
            {step === 2 ? <ScriptFields draft={draft} update={update} /> : null}
            {step === 3 ? (
              <AssetFields draft={draft} update={update} avatars={avatars} selectedAvatar={selectedAvatar} />
            ) : null}
            {step === 4 ? (
              <Review
                draft={draft}
                selectedAvatar={selectedAvatar}
                quote={quote}
                quoting={quoting}
                quoteError={quoteError}
                credits={credits}
                promptLength={scenePrompt.length}
                onEdit={setStep}
                onConfirm={() => setConfirmOpen(true)}
                canGenerate={canGenerate}
              />
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {formError}
            </p>
          ) : null}

          <div className="mt-7 flex items-center justify-between border-t border-hairline pt-5">
            <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue
                <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!canGenerate}>
                <Clapperboard aria-hidden />
                {quoting ? "Getting estimate…" : "Generate scene"}
              </Button>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        pending={starting}
        options={{
          title: "Start video generation?",
          description: `This will generate a ${draft.durationSeconds}-second scene and use ${quote ?? "an estimated"} credits. ${credits === null ? "Your current balance is unavailable." : `Your remaining balance is ${credits.toLocaleString("en-US")} credits.`} The clip will be saved to your Library when generation finishes.`,
          confirmLabel: starting ? "Starting…" : "Confirm generation",
          cancelLabel: "Review first",
        }}
        onResolve={(confirmed) => {
          if (!confirmed) {
            setConfirmOpen(false);
            return;
          }
          void generate();
        }}
      />
    </div>
  );
}

function ObjectiveFields({
  draft,
  update,
}: {
  readonly draft: GenerationDraft;
  readonly update: <K extends keyof GenerationDraft>(field: K, value: GenerationDraft[K]) => void;
}): ReactNode {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={LABEL}>
        Video purpose
        <select className={FIELD} value={draft.objective} onChange={(event) => update("objective", event.target.value)}>
          {["Promotion", "Brand awareness", "Education", "Product demonstration", "Other"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <TextField label="Target audience" value={draft.audience} onChange={(value) => update("audience", value)} placeholder="Who is this video for?" maxLength={300} />
      <TextField label="Product or service" value={draft.offering} onChange={(value) => update("offering", value)} placeholder="What are you featuring?" maxLength={300} />
      <TextField label="Target country" value={draft.country} onChange={(value) => update("country", value)} placeholder="e.g. Singapore" maxLength={100} />
      <label className={LABEL}>
        Language
        <select className={FIELD} value={draft.language} onChange={(event) => update("language", event.target.value)}>
          {["English", "Malay", "Mandarin", "Tamil", "Other"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}

function FormatFields({
  draft,
  update,
  quote,
  quoting,
  quoteError,
  onRetryQuote,
}: {
  readonly draft: GenerationDraft;
  readonly update: <K extends keyof GenerationDraft>(field: K, value: GenerationDraft[K]) => void;
  readonly quote: number | null;
  readonly quoting: boolean;
  readonly quoteError: string | null;
  readonly onRetryQuote: () => void;
}): ReactNode {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={LABEL}>
        Platform
        <select className={FIELD} value={draft.platform} onChange={(event) => update("platform", event.target.value as GenerationDraft["platform"])}>
          <option>TikTok</option>
          <option>Instagram Reels</option>
          <option>YouTube Shorts</option>
        </select>
      </label>
      <label className={LABEL}>
        Video duration
        <select className={FIELD} value={draft.durationSeconds} onChange={(event) => update("durationSeconds", Number(event.target.value))}>
          {[3, 5, 8, 10, 12, 15].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
        </select>
      </label>
      <div>
        <span className={LABEL}>Aspect ratio</span>
        <p className={`${FIELD} flex items-center bg-cloud/40 text-ink-soft`}>9:16 vertical · currently supported</p>
      </div>
      <label className={LABEL}>
        Visual style
        <input className={FIELD} maxLength={200} value={draft.style} onChange={(event) => update("style", event.target.value)} placeholder="e.g. warm, documentary, high-energy" />
      </label>
      <label className={LABEL}>
        Content format
        <select className={FIELD} value={draft.contentType} onChange={(event) => update("contentType", event.target.value as GenerationDraft["contentType"])}>
          <option>Human-led</option>
          <option>Product-focused</option>
          <option>Mixed</option>
        </select>
      </label>
      <div className="rounded-xl border border-hairline bg-cloud/40 p-3 sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">Credit estimate</span>
          <span aria-live="polite" className="text-sm font-semibold tabular-nums text-ink">
            {quoting ? "Calculating…" : quote === null ? "Unavailable" : `${quote.toLocaleString("en-US")} credits`}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          The estimate is provided by the video service for this duration and may change if you edit the duration.
        </p>
        {quoteError ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p role="alert" className="text-xs text-destructive">{quoteError}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetryQuote}><RotateCw aria-hidden />Retry</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ScriptFields({
  draft,
  update,
}: {
  readonly draft: GenerationDraft;
  readonly update: <K extends keyof GenerationDraft>(field: K, value: GenerationDraft[K]) => void;
}): ReactNode {
  function updateScene(index: number, key: keyof GenerationDraft["scenes"][number], value: string): void {
    update(
      "scenes",
      draft.scenes.map((scene, sceneIndex) => sceneIndex === index ? { ...scene, [key]: value } : scene),
    );
  }

  return (
    <div className="space-y-5">
      <TextField label="Opening hook" value={draft.hook} onChange={(value) => update("hook", value)} placeholder="The first line or moment that earns attention" maxLength={250} />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-ink">Scene-by-scene script</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={draft.scenes.length >= SCENE_LIMIT}
            onClick={() => update("scenes", [...draft.scenes, { visual: "", dialogue: "" }])}
          >
            <Plus aria-hidden />Add scene
          </Button>
        </div>
        {draft.scenes.map((scene, index) => (
          <fieldset key={index} className="grid gap-3 rounded-xl border border-hairline p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-medium text-ink-soft">Scene {index + 1}</legend>
            <label className={LABEL}>
              Visual direction
              <textarea className={`${FIELD} min-h-24 resize-y`} maxLength={500} value={scene.visual} onChange={(event) => updateScene(index, "visual", event.target.value)} placeholder="What should the viewer see?" />
            </label>
            <label className={LABEL}>
              Dialogue or narration
              <textarea className={`${FIELD} min-h-24 resize-y`} maxLength={400} value={scene.dialogue} onChange={(event) => updateScene(index, "dialogue", event.target.value)} placeholder="What is said in this scene?" />
            </label>
            {draft.scenes.length > 1 ? (
              <button type="button" className="inline-flex min-h-9 items-center gap-2 text-xs text-ink-soft hover:text-destructive sm:col-span-2" onClick={() => update("scenes", draft.scenes.filter((_, sceneIndex) => sceneIndex !== index))}>
                <Trash2 className="size-3.5" aria-hidden />Remove scene
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Voice and delivery" value={draft.voiceDirection} onChange={(value) => update("voiceDirection", value)} placeholder="e.g. friendly, confident, conversational" maxLength={200} />
        <TextField label="Call to action" value={draft.callToAction} onChange={(value) => update("callToAction", value)} placeholder="What should viewers do next?" maxLength={250} />
        <TextField label="Music and sound effects" value={draft.music} onChange={(value) => update("music", value)} placeholder="e.g. upbeat instrumental, no music" maxLength={200} />
      </div>
    </div>
  );
}

function AssetFields({
  draft,
  update,
  avatars,
  selectedAvatar,
}: {
  readonly draft: GenerationDraft;
  readonly update: <K extends keyof GenerationDraft>(field: K, value: GenerationDraft[K]) => void;
  readonly avatars: readonly TwinSummary[];
  readonly selectedAvatar: TwinSummary | null;
}): ReactNode {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-info/30 bg-info/5 p-3 text-sm leading-relaxed text-ink-soft">
        The current scene generator accepts written visual direction. Saved media selections are recorded in your draft, but are not yet attached as provider reference files.
      </div>
      <label className={LABEL}>
        Saved character reference
        <select className={FIELD} value={draft.avatarId} onChange={(event) => update("avatarId", event.target.value)}>
          <option value="">No saved character</option>
          {avatars.map((avatar) => (
            <option key={avatar.id} value={avatar.id}>{avatar.name || "Untitled character"}</option>
          ))}
        </select>
        {avatars.length === 0 ? <span className="mt-1 block text-xs font-normal text-ink-soft">No ready saved characters yet. You can add one in Assets.</span> : null}
        {selectedAvatar ? <span className="mt-1 block text-xs font-normal text-ink-soft">Selected: {selectedAvatar.name || "Untitled character"} · prompt guidance only until media references are supported.</span> : null}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Product reference" value={draft.productReference} onChange={(value) => update("productReference", value)} placeholder="Describe the product image or angle to use" maxLength={300} />
        <TextField label="Background or setting" value={draft.backgroundReference} onChange={(value) => update("backgroundReference", value)} placeholder="Describe a location, backdrop, or environment" maxLength={300} />
        <div className="sm:col-span-2">
          <TextField label="Other visual assets" value={draft.additionalAssets} onChange={(value) => update("additionalAssets", value)} placeholder="Describe other supporting visual details" maxLength={300} />
        </div>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-hairline p-3 text-sm leading-relaxed text-ink-soft">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-primary"
          checked={draft.rightsConfirmed}
          onChange={(event) => update("rightsConfirmed", event.target.checked)}
        />
        <span>I have permission and any required consent to use the people, voices, and assets described in this video.</span>
      </label>
    </div>
  );
}

function Review({
  draft,
  selectedAvatar,
  quote,
  quoting,
  quoteError,
  credits,
  promptLength,
  onEdit,
  onConfirm,
  canGenerate,
}: {
  readonly draft: GenerationDraft;
  readonly selectedAvatar: TwinSummary | null;
  readonly quote: number | null;
  readonly quoting: boolean;
  readonly quoteError: string | null;
  readonly credits: number | null;
  readonly promptLength: number;
  readonly onEdit: (step: number) => void;
  readonly onConfirm: () => void;
  readonly canGenerate: boolean;
}): ReactNode {
  const rows = [
    ["Purpose", draft.objective],
    ["Audience", draft.audience],
    ["Product or service", draft.offering],
    ["Country and language", [draft.country, draft.language].filter(Boolean).join(" · ")],
    ["Platform and duration", `${draft.platform} · ${draft.durationSeconds}s · 9:16 vertical`],
    ["Style and format", `${draft.style} · ${draft.contentType}`],
    ["Opening hook", draft.hook],
    ["Scenes", `${draft.scenes.length} scene${draft.scenes.length === 1 ? "" : "s"}`],
    ["Voice direction", draft.voiceDirection],
    ["Call to action", draft.callToAction],
    ["Music and sound", draft.music],
    ["Saved character", selectedAvatar?.name ?? "None"],
    ["Product / background guidance", [draft.productReference, draft.backgroundReference].filter(Boolean).join(" · ")],
    ["Other assets", draft.additionalAssets],
  ].filter(([, value]) => value !== "");

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-hairline">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-hairline px-3 py-2.5 last:border-b-0 sm:grid-cols-[150px_1fr] sm:gap-4">
            <span className="text-xs font-medium text-ink-soft">{label}</span>
            <span className="whitespace-pre-wrap wrap-break-word text-sm text-ink">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-cloud/40 p-4">
        <div>
          <p className="text-sm font-medium text-ink">Estimated generation cost</p>
          <p className="mt-1 text-xs text-ink-soft">
            Remaining balance: {credits === null ? "unavailable" : `${credits.toLocaleString("en-US")} credits`}
          </p>
        </div>
        <p aria-live="polite" className="text-lg font-semibold tabular-nums text-ink">
          {quoting ? "Calculating…" : quote === null ? "Unavailable" : `${quote.toLocaleString("en-US")} credits`}
        </p>
      </div>

      {quoteError ? <p role="alert" className="text-sm text-destructive">{quoteError}</p> : null}
      {quote !== null && credits !== null && credits < quote ? (
        <p role="alert" className="text-sm text-destructive">
          Your balance is short by {(quote - credits).toLocaleString("en-US")} credits.{" "}
          <Link href="/dashboard/credits" className="font-medium underline underline-offset-2">Get more credits</Link>
        </p>
      ) : null}
      {promptLength > PROMPT_LIMIT ? (
        <p role="alert" className="text-sm text-destructive">
          The generation brief is {promptLength.toLocaleString("en-US")} characters; reduce it to {PROMPT_LIMIT.toLocaleString("en-US")} or fewer.
        </p>
      ) : (
        <p className="text-xs text-ink-soft">Generation brief: {promptLength.toLocaleString("en-US")} / {PROMPT_LIMIT.toLocaleString("en-US")} characters.</p>
      )}
      <p className="text-xs leading-relaxed text-ink-soft">
        This backend currently generates one 3–15 second scene per request. Saved media is shown as guidance only; uploading and binding reusable reference files is not yet supported here.
      </p>

      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((target) => (
          <Button key={target} type="button" variant="outline" size="sm" onClick={() => onEdit(target)}>
            Edit {STEPS[target]?.title}
          </Button>
        ))}
      </div>

      <Button type="button" className="w-full" onClick={onConfirm} disabled={!canGenerate}>
        <Clapperboard aria-hidden />Confirm and generate scene
      </Button>
    </div>
  );
}

function GenerationStatus({
  job,
  statusError,
  adoptState,
  adoptError,
  onRetry,
  onStartOver,
}: {
  readonly job: JobView;
  readonly statusError: string | null;
  readonly adoptState: "idle" | "saving" | "saved" | "failed";
  readonly adoptError: string | null;
  readonly onRetry: () => void;
  readonly onStartOver: () => void;
}): ReactNode {
  const failed = job.status === "failed";
  const complete = job.status === "completed";
  const progress = Math.max(0, Math.min(100, job.progress));

  return (
    <section aria-live="polite" aria-labelledby="generation-status-title" className="rounded-2xl border border-hairline bg-paper p-5 sm:p-8">
      <div className="flex items-start gap-3">
        {failed ? <CircleAlert className="mt-0.5 size-5 text-destructive" aria-hidden /> : complete ? <Check className="mt-0.5 size-5 text-success" aria-hidden /> : <LoaderCircle className="mt-0.5 size-5 animate-spin text-primary" aria-hidden />}
        <div className="min-w-0 flex-1">
          <h2 id="generation-status-title" className="text-xl font-semibold text-ink">
            {failed ? "Generation failed" : complete ? "Your scene is ready" : "Generating your scene"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {failed ? job.error || "The video could not be generated." : complete ? "The scene is ready to preview." : `Status: ${formatStatus(job)}`}
          </p>
        </div>
      </div>

      {!failed && !complete ? (
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-ink-soft">
            <span>{formatStatus(job)}</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Video generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-cloud"
          >
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {statusError ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 p-3">
          <p role="alert" className="text-sm text-destructive">{statusError}</p>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}><RotateCw aria-hidden />Retry status</Button>
        </div>
      ) : null}

      {complete && job.resultUrl ? (
        <video src={job.resultUrl} controls playsInline preload="metadata" className="mt-5 max-h-[65vh] w-full rounded-xl bg-ink" aria-label="Generated video scene preview" />
      ) : null}

      {complete ? (
        <div className="mt-5 rounded-xl border border-hairline bg-cloud/40 p-4">
          {adoptState === "saving" ? <p className="text-sm text-ink-soft">Saving the finished clip to your Library…</p> : null}
          {adoptState === "saved" ? (
            <p className="text-sm text-ink">
              Saved to your Library.{" "}
              <Link href="/dashboard/library" className="font-medium text-primary underline underline-offset-2">Open Library</Link>
            </p>
          ) : null}
          {adoptState === "failed" ? (
            <div>
              <p role="alert" className="text-sm text-destructive">{adoptError}</p>
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onRetry}><RotateCw aria-hidden />Retry saving</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {failed ? (
        <div className="mt-4">
          <p className="text-xs text-ink-soft">Failed generation credits are restored by the service.</p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onStartOver}>Adjust brief and try again</Button>
        </div>
      ) : null}
      {complete && adoptState === "saved" ? (
        <Button type="button" variant="outline" className="mt-4" onClick={onStartOver}>Create another scene</Button>
      ) : null}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly maxLength: number;
}): ReactNode {
  return (
    <label className={LABEL}>
      {label}
      <input className={FIELD} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
    </label>
  );
}
