"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { createLiveAvatar } from "@/features/live-avatar-flow/actions";
import { type JobView } from "@/lib/go-api/jobs";
import { useJobSocket } from "@/lib/go-api/use-job-socket";

import { adoptVideo, sceneStatus } from "../assist-actions";
import { type ConversationTurnJob, type ProjectGeneration } from "../core/types.ts";
import { placeGeneratedVideo } from "../lib/place-generated";
import { GenerationProgress } from "./generation-progress";
import { useStudio } from "../store/editor-store";

type Turns = readonly ConversationTurnJob[];
const NO_TURNS: Turns = [];

/** Saves a change to the stored turns, so a reload resumes where it was. */
function saveTurns(update: (turns: Turns) => Turns, state?: ProjectGeneration["state"], message?: string): void {
  useStudio.getState().edit((project) => {
    const generation = project.generation;
    if (!generation?.turns) return { ok: true, value: project };
    return {
      ok: true,
      value: { ...project, generation: { ...generation, turns: [...update(generation.turns)], state: state ?? generation.state, message: message ?? generation.message } },
    };
  });
}

/**
 * Follows every turn of a conversation while the editor stays usable. Each
 * finished clip is copied in as it lands; once all are in, they are placed on
 * the timeline in speaking order so the conversation plays straight through.
 */
export function ConversationJob() {
  const generation = useStudio((state) => state.history.present.generation);
  const turns: Turns = generation?.turns ?? NO_TURNS;
  const placing = useRef(false);
  const ready = turns.length > 0 && turns.every((turn) => turn.mediaId !== undefined);

  useEffect(() => {
    if (!ready || generation?.state !== "running" || placing.current) return;
    placing.current = true;
    let error: string | null = null;
    turns.forEach((turn, index) => {
      if (error || !turn.mediaId) return;
      error = placeGeneratedVideo(turn.mediaId, turn.seconds ?? 5, `Turn ${index + 1}`).error;
    });
    saveTurns((current) => current, error ? "failed" : "completed", error ?? "Every turn is on your timeline, in order.");
  }, [ready, generation?.state, turns]);

  if (!generation || turns.length === 0) return null;
  const done = turns.filter((turn) => turn.mediaId !== undefined).length;
  const failed = turns.some((turn) => turn.state === "failed");
  const complete = generation.state === "completed";

  return (
    <section role="status" aria-live="polite" className="flex shrink-0 items-start gap-3 border-b border-hairline bg-paper px-4 py-3 text-ink sm:px-6">
      {complete ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      ) : failed ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Conversation</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {complete ? generation.message ?? "Every turn is on your timeline." : `${done} of ${turns.length} turns ready. You can keep editing meanwhile.`}
        </p>
        <GenerationProgress reported={(done / turns.length) * 100} running={!complete && !failed} label="Conversation generation" />
        {!complete && generation.message ? <p className="mt-1 text-sm text-destructive">{generation.message}</p> : null}
        <ol className="mt-2 flex flex-wrap gap-2">
          {turns.map((turn, index) => (
            <TurnStatus key={turn.jobId} turn={turn} index={index} direction={generation.direction ?? ""} />
          ))}
        </ol>
      </div>
    </section>
  );
}

/** One turn: watched over the socket with a slow poll behind it, copied in once done. */
function TurnStatus({ turn, index, direction }: { turn: ConversationTurnJob; index: number; direction: string }) {
  const active = turn.state === "running" && turn.mediaId === undefined;
  const adopting = useRef(false);

  const check = useCallback(async (): Promise<void> => {
    if (adopting.current) return;
    adopting.current = true;
    const status = await sceneStatus(turn.jobId);
    if (status.state === "failed") {
      saveTurns((turns) => turns.map((t) => (t.jobId === turn.jobId ? { ...t, state: "failed" } : t)));
    } else if (status.state === "done") {
      const copied = await adoptVideo(turn.jobId);
      saveTurns((turns) =>
        turns.map((t) =>
          t.jobId !== turn.jobId ? t : copied.ok ? { ...t, state: "completed", mediaId: copied.mediaId, seconds: status.seconds ?? undefined } : { ...t, state: "failed" },
        ),
      );
    }
    adopting.current = false;
  }, [turn.jobId]);

  const onUpdate = useCallback((job: JobView) => {
    if (job.status === "completed" || job.status === "failed") void check();
  }, [check]);

  useJobSocket({ jobId: turn.jobId, active, onUpdate, onResync: () => void check(), onConnection: () => undefined });

  useEffect(() => {
    if (!active) return;
    void check();
    const interval = setInterval(() => void check(), 5_000);
    return () => clearInterval(interval);
  }, [active, check]);

  async function retry(): Promise<void> {
    const result = await createLiveAvatar({
      faceAssetId: turn.faceAssetId,
      voiceAssetId: turn.voiceAssetId,
      script: turn.words,
      prompt: direction,
      idempotencyKey: crypto.randomUUID(),
    });
    if (result.status !== "ok") return;
    saveTurns((turns) => turns.map((t) => (t.jobId === turn.jobId ? { ...t, jobId: result.job.id, state: "running" } : t)));
  }

  const label = turn.mediaId !== undefined ? "ready" : turn.state === "failed" ? "failed" : "generating";
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs">
      <span className="font-medium">Turn {index + 1}</span>
      <span className={turn.state === "failed" ? "text-destructive" : "text-ink-soft"}>{label}</span>
      {turn.state === "failed" ? (
        <button type="button" onClick={() => void retry()} className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline">
          Retry
        </button>
      ) : null}
    </li>
  );
}
