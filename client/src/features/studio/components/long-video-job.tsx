"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { type JobView } from "@/lib/go-api/jobs";
import { useJobSocket } from "@/lib/go-api/use-job-socket";

import { adoptVideo, sceneStatus, startScene } from "../assist-actions";
import { type LongPart, type ProjectGeneration } from "../core/types.ts";
import { allReady, partsToStart, stalled } from "../lib/long-schedule.ts";
import { placeGeneratedVideo, placeVoiceover } from "../lib/place-generated";
import { useStudio } from "../store/editor-store";
import { GenerationProgress } from "./generation-progress";

type Parts = readonly LongPart[];
const NO_PARTS: Parts = [];

/** Saves a change to the stored parts, so a reload resumes where it was. */
function saveParts(update: (parts: Parts) => Parts, state?: ProjectGeneration["state"], message?: string): void {
  useStudio.getState().edit((project) => {
    const generation = project.generation;
    if (!generation?.parts) return { ok: true, value: project };
    return {
      ok: true,
      value: { ...project, generation: { ...generation, parts: [...update(generation.parts)], state: state ?? generation.state, message: message ?? generation.message } },
    };
  });
}

function patchPart(key: string, change: Partial<LongPart>): void {
  saveParts((parts) => parts.map((part) => (part.key === key ? { ...part, ...change } : part)));
}

/**
 * Makes a long video as several clips. At most three render at once (the
 * server's limit), the next starts as one finishes, each finished clip is
 * copied in, and once all are in they are placed on the timeline in order.
 * Progress is stored in the project, so closing the tab only pauses it:
 * clips already rendering carry on, and reopening starts the rest.
 */
export function LongVideoJob() {
  const generation = useStudio((state) => state.history.present.generation);
  const parts: Parts = generation?.parts ?? NO_PARTS;
  const starting = useRef(new Set<string>());
  const placing = useRef(false);
  const ready = allReady(parts);
  const running = generation?.state === "running";

  const startNext = useCallback(async (): Promise<void> => {
    const current = useStudio.getState().history.present.generation;
    if (!current?.parts || current.state !== "running") return;
    for (const index of partsToStart(current.parts, starting.current.size)) {
      const part = current.parts[index];
      if (!part || starting.current.has(part.key)) continue;
      starting.current.add(part.key);
      const result = await startScene({
        prompt: part.prompt,
        seconds: part.seconds,
        key: part.key,
        sound: current.sound ?? false,
        notifyEmail: false,
        ...(current.aspectRatio ? { aspectRatio: current.aspectRatio } : {}),
        ...(current.imageMediaId ? { imageMediaId: current.imageMediaId } : {}),
      });
      starting.current.delete(part.key);
      if (result.ok) patchPart(part.key, { state: "running", jobId: result.jobId });
      // The server's limit is shared with the person's other clips: wait for a slot, do not fail.
      else if (result.code !== "too_many_requests") patchPart(part.key, { state: "failed", message: result.message.slice(0, 300) });
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    void startNext();
    const interval = setInterval(() => void startNext(), 10_000);
    return () => clearInterval(interval);
  }, [running, startNext, parts]);

  useEffect(() => {
    if (!ready || !running || placing.current) return;
    placing.current = true;
    let error: string | null = null;
    parts.forEach((part, index) => {
      if (error || !part.mediaId) return;
      error = placeGeneratedVideo(part.mediaId, part.seconds, `Part ${index + 1}`).error;
    });
    // The one recording goes under the finished clips, so the voice is the same all the way through.
    if (!error && generation?.voiceoverMediaId) error = placeVoiceover(generation.voiceoverMediaId, generation.voiceoverSeconds ?? parts.reduce((sum, part) => sum + part.seconds, 0)).error;
    saveParts((current) => current, error ? "failed" : "completed", error ?? "Every part is on your timeline, in order.");
  }, [ready, running, parts, generation?.voiceoverMediaId, generation?.voiceoverSeconds]);

  if (!generation || parts.length === 0) return null;
  const done = parts.filter((part) => part.mediaId !== undefined).length;
  const total = parts.reduce((sum, part) => sum + part.seconds, 0);
  const needsYou = stalled(parts);
  const complete = generation.state === "completed";

  return (
    <section role="status" aria-live="polite" className="flex shrink-0 items-start gap-3 border-b border-hairline bg-paper px-4 py-3 text-ink sm:px-6">
      {complete ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      ) : needsYou ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Long video, {Math.floor(total / 60)}:{String(total % 60).padStart(2, "0")}</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {complete
            ? generation.message ?? "Every part is on your timeline."
            : `${done} of ${parts.length} parts ready. It keeps going while you edit, and carries on if you close this page and come back.`}
        </p>
        <GenerationProgress reported={(done / parts.length) * 100} running={!complete && !needsYou} label="Long video generation" />
        <ol className="mt-2 flex flex-wrap gap-2">
          {parts.map((part, index) => (
            <PartStatus key={part.key} part={part} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
}

/** One part: watched over the socket with a slow poll behind it, copied in once done. */
function PartStatus({ part, index }: { part: LongPart; index: number }) {
  const active = part.state === "running" && part.mediaId === undefined && part.jobId !== undefined;
  const adopting = useRef(false);
  const jobId = part.jobId;

  const check = useCallback(async (): Promise<void> => {
    if (adopting.current || !jobId) return;
    adopting.current = true;
    try {
      const status = await sceneStatus(jobId);
      if (status.state === "failed") {
        patchPart(part.key, { state: "failed", message: status.message.slice(0, 300) });
      } else if (status.state === "done") {
        const copied = await adoptVideo(jobId);
        if (copied.ok) patchPart(part.key, { state: "completed", mediaId: copied.mediaId, seconds: status.seconds ? Math.min(15, Math.max(3, Math.round(status.seconds))) : part.seconds });
        else patchPart(part.key, { state: "failed", message: copied.message.slice(0, 300) });
      }
    } finally {
      adopting.current = false;
    }
  }, [jobId, part.key, part.seconds]);

  const onUpdate = useCallback((job: JobView) => {
    if (job.status === "completed" || job.status === "failed") void check();
  }, [check]);

  useJobSocket({ jobId: jobId ?? "", active, onUpdate, onResync: () => void check(), onConnection: () => undefined });

  useEffect(() => {
    if (!active) return;
    void check();
    const interval = setInterval(() => void check(), 5_000);
    return () => clearInterval(interval);
  }, [active, check]);

  const label = part.mediaId !== undefined ? "ready" : part.state === "failed" ? "failed" : part.state === "pending" ? "waiting" : "generating";
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs" title={part.state === "failed" ? part.message : undefined}>
      <span className="font-medium">Part {index + 1}</span>
      <span className={part.state === "failed" ? "text-destructive" : "text-ink-soft"}>{label}</span>
      {part.state === "failed" ? (
        <button
          type="button"
          onClick={() => patchPart(part.key, { state: "pending", key: crypto.randomUUID(), jobId: undefined, message: undefined })}
          className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
        >
          Retry
        </button>
      ) : null}
    </li>
  );
}
