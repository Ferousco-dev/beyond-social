"use client";

import { ArrowUp, Coins, Paperclip, RotateCcw, Video, X } from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { uploadGroupFile } from "@/features/asset-groups/upload";
import { CreditShortfallDialog } from "@/features/generate-form/credit-shortfall-dialog";
import { planLongVideo } from "@/features/generate-form/long-video";
import { cachedLongQuote, cachedSceneQuote } from "@/features/generate-form/scene-quotes";
import { createEditorProject } from "@/features/studio/actions";
import { adoptVideo, sceneStatus, startScene } from "@/features/studio/assist-actions";
import { Spinner } from "@/components/ui/spinner";
import { standardType } from "@/lib/file-type";
import { cn } from "@/lib/utils";

import { quoteEdit, startEdit, suggestPrompt, wallet, type Wallet } from "../actions";
import { PromptChoiceDialog } from "./prompt-choice-dialog";

const MAX_PICTURES = 4;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MIN_SECONDS = 3;
const MAX_SECONDS = 15;
const PICTURE_TYPES = new Set(["image/jpeg", "image/png"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
/** Up to three minutes. Anything over one clip (15 seconds) is made as several clips in the editor. */
const LENGTHS = [10, 15, 30, 60, 120, 180] as const;
const ONE_CLIP = 15;
const ASPECT = "9:16";
const POLL_MS = 5_000;

type Ratio = "9:16" | "16:9" | "1:1";

/** "45s", "1 min", "2 min 30s". */
function lengthLabel(seconds: number, short = false): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (short) return `${minutes}m`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest}s`;
}

/** The credits a new video of this length costs: one clip, or the sum of its clips. */
function quoteLength(seconds: number): Promise<number | null> {
  return seconds > ONE_CLIP ? cachedLongQuote(seconds) : cachedSceneQuote(seconds);
}

interface Attachment {
  readonly key: string;
  readonly kind: "picture" | "video";
  readonly name: string;
  readonly preview: string;
  readonly status: "uploading" | "ready" | "error";
  readonly mediaId?: string;
  readonly error?: string;
  readonly ratio?: Ratio;
}

type Stage =
  | { readonly kind: "compose" }
  | { readonly kind: "suggesting" }
  | { readonly kind: "choose"; readonly suggestion: string | null; readonly note: string | null }
  | { readonly kind: "quoting" }
  | { readonly kind: "confirm"; readonly prompt: string; readonly credits: number; readonly seconds: number; readonly wallet: Wallet }
  | { readonly kind: "starting" }
  | { readonly kind: "running"; readonly jobId: string }
  | { readonly kind: "done"; readonly url: string }
  | { readonly kind: "failed"; readonly message: string };

/** The closest shape the models accept, from a video's own size. */
function ratioOf(width: number, height: number): Ratio {
  const r = width / height;
  if (r > 1.2) return "16:9";
  if (r < 0.83) return "9:16";
  return "1:1";
}

/** Reads a video's length and shape in the browser, to refuse a wrong file before uploading it. */
function probeVideo(url: string): Promise<{ seconds: number; ratio: Ratio } | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const done = (value: { seconds: number; ratio: Ratio } | null) => {
      video.removeAttribute("src");
      resolve(value);
    };
    video.onloadedmetadata = () =>
      done(Number.isFinite(video.duration) && video.videoWidth > 0 ? { seconds: video.duration, ratio: ratioOf(video.videoWidth, video.videoHeight) } : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

/**
 * New Video's composer: attach a photo or a video of yourself, say what you
 * want, and choose your words or Gemini's. The cost is shown in credits and
 * nothing is charged until you confirm.
 *
 * With a video attached it edits that video (outfit, background), keeping the
 * person as they filmed themselves. Without one it makes a new clip, starting
 * from the photo when there is one.
 */
export function Composer(): ReactNode {
  const router = useRouter();
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState<(typeof LENGTHS)[number]>(10);
  const [account, setAccount] = useState<Wallet | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "compose" });
  const [notice, setNotice] = useState<string | null>(null);
  const [shortOpen, setShortOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const keyRef = useRef<string>("");

  const video = attachments.find((a) => a.kind === "video") ?? null;
  const pictures = attachments.filter((a) => a.kind === "picture");
  const mode = video ? "edit" : "create";
  const uploading = attachments.some((a) => a.status === "uploading");
  const broken = attachments.some((a) => a.status === "error");
  const busy = stage.kind === "suggesting" || stage.kind === "quoting" || stage.kind === "starting";

  // Object URLs are released when an attachment goes away or the composer closes.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function update(key: string, patch: Partial<Attachment>): void {
    setAttachments((list) => list.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  }

  async function add(files: FileList | null): Promise<void> {
    setNotice(null);
    if (!files) return;
    for (const file of Array.from(files)) {
      const type = standardType(file.type, file.name);
      const isVideo = VIDEO_TYPES.has(type);
      if (!isVideo && !PICTURE_TYPES.has(type)) {
        setNotice(`${file.name}: use a JPG or PNG photo, or an MP4 or MOV video.`);
        continue;
      }
      if (isVideo && (video || attachments.some((a) => a.kind === "video"))) {
        setNotice("Attach one video at a time.");
        continue;
      }
      if (!isVideo && pictures.length >= MAX_PICTURES) {
        setNotice(`Attach up to ${MAX_PICTURES} photos.`);
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        setNotice("That video is over 100 MB. Trim it or record a shorter clip.");
        continue;
      }
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      let ratio: Ratio | undefined;
      if (isVideo) {
        const probe = await probeVideo(preview);
        if (!probe) {
          setNotice("That video could not be read. Try an MP4 or MOV file.");
          URL.revokeObjectURL(preview);
          continue;
        }
        if (probe.seconds < MIN_SECONDS || probe.seconds > MAX_SECONDS + 0.5) {
          setNotice(`Use a video of ${MIN_SECONDS} to ${MAX_SECONDS} seconds. This one is ${Math.round(probe.seconds)} seconds.`);
          URL.revokeObjectURL(preview);
          continue;
        }
        ratio = probe.ratio;
      }
      const key = crypto.randomUUID();
      setAttachments((list) => [...list, { key, kind: isVideo ? "video" : "picture", name: file.name, preview, status: "uploading", ...(ratio ? { ratio } : {}) }]);
      void uploadGroupFile(file).then((result) =>
        result.status === "ok" ? update(key, { status: "ready", mediaId: result.mediaId }) : update(key, { status: "error", error: result.message }),
      );
    }
  }

  function remove(key: string): void {
    setAttachments((list) => {
      const gone = list.find((a) => a.key === key);
      if (gone) {
        URL.revokeObjectURL(gone.preview);
        previews.current.delete(gone.preview);
      }
      return list.filter((a) => a.key !== key);
    });
    setStage({ kind: "compose" });
  }

  function readyIds(kind: "picture" | "video"): string[] {
    return attachments.filter((a) => a.kind === kind && a.mediaId).map((a) => a.mediaId as string);
  }

  /** First step of sending: open the choice and have our AI write a clearer version to choose from. */
  async function send(): Promise<void> {
    setNotice(null);
    if (prompt.trim() === "" || busy || uploading) return;
    if (broken) {
      setNotice("Remove the file that failed to upload, or attach it again.");
      return;
    }
    if (mode === "create" && pictures.length > 1) {
      setNotice("Without a video, attach one photo: it becomes the first frame. Add a video to use photos as references.");
      return;
    }
    setStage({ kind: "suggesting" });
    const videoId = readyIds("video")[0];
    const result = await suggestPrompt({ mode, prompt, pictureIds: readyIds("picture"), ...(videoId ? { videoId } : {}) });
    // The person may already have picked their own prompt or closed the choice.
    setStage((current) =>
      current.kind !== "suggesting"
        ? current
        : result.ok
          ? { kind: "choose", suggestion: result.prompt, note: null }
          : { kind: "choose", suggestion: null, note: `${result.message} You can still use your own words.` },
    );
  }

  /** Second step: price the chosen prompt in credits and show it before anything is charged. */
  async function choose(chosen: string): Promise<void> {
    setStage({ kind: "quoting" });
    const videoId = readyIds("video")[0];
    const [quote, account] = await Promise.all([
      videoId ? quoteEdit(videoId) : quoteLength(seconds).then((credits) => (credits === null ? { ok: false as const, message: "Could not work out the cost. Try again." } : { ok: true as const, credits, seconds })),
      wallet(),
    ]);
    if (!quote.ok) {
      setStage({ kind: "failed", message: quote.message });
      return;
    }
    keyRef.current = crypto.randomUUID();
    setStage({ kind: "confirm", prompt: chosen, credits: quote.credits, seconds: quote.seconds, wallet: account });
    if (account.balance !== null && quote.credits > account.balance) setShortOpen(true);
  }

  /** Last step, after the person confirms the cost. */
  async function make(chosen: string): Promise<void> {
    setStage({ kind: "starting" });
    const videoId = readyIds("video")[0];
    const picture = readyIds("picture")[0];
    if (!videoId && seconds > ONE_CLIP) {
      await makeLong(chosen, picture);
      return;
    }
    const result = videoId
      ? await startEdit({ videoId, pictureIds: readyIds("picture"), prompt: chosen, aspectRatio: video?.ratio ?? "9:16", key: keyRef.current })
      : await startScene({ prompt: chosen, seconds, key: keyRef.current, aspectRatio: ASPECT, ...(picture ? { imageMediaId: picture } : {}) });
    setStage(result.ok ? { kind: "running", jobId: result.jobId } : { kind: "failed", message: result.message });
  }

  /**
   * A video longer than one clip is planned as several clips. The first starts
   * now, which checks the credits; the editor opens and starts the rest as slots
   * free up, the same way the main form makes long videos.
   */
  async function makeLong(chosen: string, picture: string | undefined): Promise<void> {
    const plan = planLongVideo({ setting: chosen, story: "", totalSeconds: seconds });
    const keys = plan.map((_, index) => (index === 0 ? keyRef.current : crypto.randomUUID()));
    const first = plan[0];
    if (!first) {
      setStage({ kind: "failed", message: "That video could not be planned. Try again." });
      return;
    }
    const started = await startScene({ prompt: first.prompt, seconds: first.seconds, key: keys[0] ?? keyRef.current, aspectRatio: ASPECT, ...(picture ? { imageMediaId: picture } : {}) });
    if (!started.ok) {
      setStage({ kind: "failed", message: started.message });
      return;
    }
    const project = await createEditorProject({
      title: chosen.slice(0, 60).trim() || "New video",
      generation: {
        jobId: started.jobId,
        script: chosen,
        state: "running",
        generator: "long",
        aspectRatio: ASPECT,
        sound: false,
        ...(picture ? { imageMediaId: picture } : {}),
        parts: plan.map((part, index) => ({
          key: keys[index] ?? crypto.randomUUID(),
          prompt: part.prompt,
          seconds: part.seconds,
          state: index === 0 ? ("running" as const) : ("pending" as const),
          ...(index === 0 ? { jobId: started.jobId } : {}),
        })),
      },
    });
    if (!project.ok) {
      setStage({ kind: "failed", message: `The first part has started, but the editor could not open: ${project.message}` });
      return;
    }
    router.push(`/editor/${project.value}?job=${started.jobId}&script=${encodeURIComponent(chosen)}` as Route);
  }

  // The balance is read once, in the background, so the cost can turn red before anyone clicks.
  useEffect(() => {
    let active = true;
    void wallet().then((w) => {
      if (active) setAccount(w);
    });
    return () => {
      active = false;
    };
  }, []);

  // The cost of what is set up right now: the chosen length, or the attached video's own length.
  const videoMediaId = video?.mediaId ?? null;
  useEffect(() => {
    let active = true;
    setEstimate(null);
    const pending = videoMediaId ? quoteEdit(videoMediaId).then((q) => (q.ok ? q.credits : null)) : video ? Promise.resolve(null) : quoteLength(seconds);
    void pending.then((credits) => {
      if (active) setEstimate(credits);
    });
    return () => {
      active = false;
    };
  }, [seconds, videoMediaId, video]);

  // Follows a running job until it finishes, then keeps a copy in the person's own storage.
  const runningId = stage.kind === "running" ? stage.jobId : null;
  useEffect(() => {
    if (!runningId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const status = await sceneStatus(runningId);
      if (stopped) return;
      if (status.state === "done") {
        setStage({ kind: "done", url: status.url });
        void adoptVideo(runningId);
        return;
      }
      if (status.state === "failed") {
        setStage({ kind: "failed", message: status.message });
        return;
      }
      timer = setTimeout(() => void check(), POLL_MS);
    };
    timer = setTimeout(() => void check(), POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [runningId]);

  function reset(): void {
    attachments.forEach((a) => {
      URL.revokeObjectURL(a.preview);
      previews.current.delete(a.preview);
    });
    setAttachments([]);
    setPrompt("");
    setNotice(null);
    setStage({ kind: "compose" });
  }

  const editing = stage.kind === "compose" || stage.kind === "suggesting";

  return (
    <section aria-label="Describe your video" className="sticky bottom-4 z-20 mt-10">
      <PromptChoiceDialog
        open={stage.kind === "suggesting" || stage.kind === "choose"}
        prompt={prompt}
        suggestion={stage.kind === "choose" ? stage.suggestion : null}
        loading={stage.kind === "suggesting"}
        note={stage.kind === "choose" ? stage.note : null}
        onUse={(text) => void choose(text)}
        onClose={() => setStage({ kind: "compose" })}
      />
      {stage.kind !== "compose" && stage.kind !== "suggesting" && stage.kind !== "choose" ? (
        <div className="mb-2 rounded-xl border border-hairline bg-paper p-4 shadow-card">
          <Panel
            stage={stage}
            mode={mode}
            onMake={(text) => void make(text)}
            onBack={() => setStage({ kind: "compose" })}
            onReset={reset}
            onShort={() => setShortOpen(true)}
          />
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className={cn(
          "rounded-xl border border-hairline bg-paper shadow-card transition-colors",
          "focus-within:border-ink/20",
          !editing && "opacity-80",
        )}
      >
        {attachments.length > 0 ? (
          <ul className="flex gap-2 overflow-x-auto px-3 pt-3" aria-label="Attached files">
            {attachments.map((a) => (
              <li key={a.key} className="group relative size-14 shrink-0 overflow-hidden rounded-lg border border-hairline bg-cloud">
                {a.kind === "video" ? (
                  <video src={a.preview} muted playsInline className="size-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview of the person's own file
                  <img src={a.preview} alt="" className="size-full object-cover" />
                )}
                {a.kind === "video" ? (
                  <span className="absolute bottom-1 left-1 grid size-4 place-items-center rounded bg-ink/60 text-paper">
                    <Video className="size-2.5" aria-hidden />
                  </span>
                ) : null}
                {a.status === "uploading" ? (
                  <span className="absolute inset-0 grid place-items-center bg-paper/70" aria-label={`Uploading ${a.name}`}>
                    <Spinner className="size-4 text-ink-soft" />
                  </span>
                ) : null}
                {a.status === "error" ? (
                  <span className="absolute inset-0 grid place-items-center bg-paper/85 text-[10px] font-medium text-destructive" title={a.error}>
                    Failed
                  </span>
                ) : null}
                {editing ? (
                  <button
                    type="button"
                    onClick={() => remove(a.key)}
                    aria-label={`Remove ${a.name}`}
                    className="absolute right-1 top-1 grid size-5 cursor-pointer place-items-center rounded-full bg-ink/70 text-paper opacity-0 transition-opacity hover:bg-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <label htmlFor="composer-prompt" className="sr-only">
          Describe your video
        </label>
        <textarea
          id="composer-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          readOnly={!editing}
          rows={2}
          maxLength={2000}
          placeholder={video ? "What should change? For example: put me in a navy suit, in a bright office" : "Describe the video you want to make…"}
          className="block max-h-48 min-h-[4.5rem] w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-soft/70 field-sizing-content"
        />

        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,video/mp4,video/quicktime,.mov"
            multiple
            hidden
            onChange={(event) => {
              void add(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={!editing || busy}
            aria-label="Attach a photo or video"
            title="Attach a photo or video"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40"
          >
            <Paperclip className="size-4" aria-hidden />
          </button>

          <div className="flex items-center gap-2">
            {mode === "create" && editing ? (
              <div className="flex h-8 items-center rounded-lg bg-cloud p-0.5" role="group" aria-label="Video length">
                {LENGTHS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeconds(n)}
                    aria-pressed={seconds === n}
                    aria-label={lengthLabel(n)}
                    className={cn(
                      "h-7 cursor-pointer rounded-md px-2.5 text-[13px] tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                      seconds === n ? "bg-paper font-medium text-ink shadow-sm" : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {lengthLabel(n, true)}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={!editing || busy || uploading || prompt.trim() === ""}
              aria-label="Send"
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-ink text-paper transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:bg-cloud disabled:text-ink-soft/60"
            >
              {stage.kind === "suggesting" ? <Spinner className="size-4" /> : <ArrowUp className="size-4" aria-hidden />}
            </button>
          </div>
        </div>
      </form>

      {notice ? (
        <p role="alert" className="mt-2 px-1 text-[13px] text-destructive">
          {notice}
        </p>
      ) : (
        <div className="mt-2 flex items-start justify-between gap-3 px-1 text-xs">
          <p className="text-ink-soft">
            {video
              ? "Your face and movements stay exactly as you filmed them."
              : pictures.length === 1
                ? "Your photo becomes the first frame of the video."
                : seconds > ONE_CLIP
                  ? "Long videos are made in parts and open in the editor."
                  : "Add a 3–15 second video of yourself to change your outfit or background."}
          </p>
          <CostTag credits={estimate} balance={account?.balance ?? null} />
        </div>
      )}

      {stage.kind === "confirm" && stage.wallet.balance !== null && stage.credits > stage.wallet.balance ? (
        <CreditShortfallDialog open={shortOpen} onClose={() => setShortOpen(false)} cost={stage.credits} balance={stage.wallet.balance} proPrice={stage.wallet.proPrice} />
      ) : null}
    </section>
  );
}

function Panel({
  stage,
  mode,
  onMake,
  onBack,
  onReset,
  onShort,
}: {
  stage: Stage;
  mode: "edit" | "create";
  onMake: (text: string) => void;
  onBack: () => void;
  onReset: () => void;
  onShort: () => void;
}): ReactNode {
  switch (stage.kind) {
    case "quoting":
    case "starting":
      return (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner className="size-4" /> {stage.kind === "quoting" ? "Working out the cost…" : "Starting…"}
        </p>
      );
    case "confirm": {
      const short = stage.wallet.balance !== null && stage.credits > stage.wallet.balance;
      return (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Coins className="size-4 text-primary" aria-hidden />
            <span>
              This {lengthLabel(stage.seconds)} {mode === "edit" ? "edit" : "video"} costs{" "}
              <span className="font-semibold tabular-nums">{stage.credits} credits</span>.
              {stage.wallet.balance !== null ? <span className="text-ink-soft"> You have {stage.wallet.balance}.</span> : null}
            </span>
          </p>
          <p className="line-clamp-2 text-xs text-ink-soft">{stage.prompt}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (short ? onShort() : onMake(stage.prompt))}
              className="h-10 cursor-pointer rounded-lg bg-ink px-5 text-sm font-medium text-paper hover:opacity-90"
            >
              {short ? "Get more credits" : `Make it for ${stage.credits} credits`}
            </button>
            <button type="button" onClick={onBack} className="h-10 cursor-pointer rounded-lg border border-hairline px-5 text-sm text-ink hover:bg-cloud">
              Cancel
            </button>
          </div>
        </div>
      );
    }
    case "running":
      return (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Spinner className="size-4" /> {mode === "edit" ? "Editing your video…" : "Making your video…"}
          </p>
          <p className="text-xs text-ink-soft">This usually takes a few minutes. You can leave this page; the video will be in your library.</p>
        </div>
      );
    case "done":
      return (
        <div className="flex flex-col gap-3">
          <video src={stage.url} controls playsInline className="max-h-[60vh] w-full rounded-xl bg-ink" />
          <p className="text-xs text-ink-soft">Saved to your library.{mode === "edit" ? " The edited video is silent for now; your original sound will be added back in a later update." : ""}</p>
          <button type="button" onClick={onReset} className="inline-flex h-10 cursor-pointer items-center gap-2 self-start rounded-lg border border-hairline px-5 text-sm text-ink hover:bg-cloud">
            <RotateCcw className="size-4" aria-hidden /> Make another
          </button>
        </div>
      );
    case "failed":
      return (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-destructive">
            {stage.message}
          </p>
          <button type="button" onClick={onBack} className="self-start cursor-pointer text-sm text-ink underline-offset-2 hover:underline">
            Try again
          </button>
        </div>
      );
    default:
      return null;
  }
}

/** The credits the video will cost, in red when the balance does not cover it. */
function CostTag({ credits, balance }: { credits: number | null; balance: number | null }): ReactNode {
  if (credits === null) return <span className="h-4 w-16 shrink-0 animate-pulse rounded bg-cloud" aria-hidden />;
  const short = balance !== null && credits > balance;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 tabular-nums", short ? "font-medium text-destructive" : "text-ink-soft")}
      title={balance !== null ? `You have ${balance} credits` : undefined}
    >
      <Coins className="size-3.5" aria-hidden />
      {credits} credits
      {short ? <span className="font-normal">· you have {balance}</span> : null}
    </span>
  );
}
