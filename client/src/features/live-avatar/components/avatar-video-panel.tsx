"use client";

import { useEffect, useId, useState } from "react";
import { Clapperboard } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { isFinished } from "@/lib/go-api/jobs";
import { type GoVoice } from "@/lib/go-api/schemas";

import { listVoices, selectTwinVoice } from "../avatar-video-actions";
import { type TwinSummary } from "../delete-actions";
import { useAvatarVideo } from "../hooks/use-avatar-video";
import { VideoStatus } from "./avatar-video-status";

const SCRIPT_LIMIT = 3000;

const FIELD =
  "w-full rounded-lg border border-hairline bg-paper px-3 text-[13px] text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

/**
 * Writing a script and having a saved avatar speak it.
 *
 * Only avatars that are ready appear. The voice shown is the one associated
 * with the avatar; changing it saves the association, and the API refuses any
 * voice the person is not allowed to use.
 */
export function AvatarVideoPanel({ twins }: { twins: readonly TwinSummary[] }) {
  const ready = twins.filter((t) => t.trainingStatus === "ready" && t.voiceId !== null);
  const scriptId = useId();
  const avatarFieldId = useId();
  const voiceFieldId = useId();

  const [avatarId, setAvatarId] = useState(ready.find((t) => t.isDefault)?.id ?? ready[0]?.id ?? "");
  const [script, setScript] = useState("");
  const [voices, setVoices] = useState<readonly GoVoice[]>([]);
  const [voiceChoice, setVoiceChoice] = useState<Readonly<Record<string, string>>>({});
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const video = useAvatarVideo();

  // Loaded once: the list does not depend on which avatar is selected.
  const hasReady = ready.length > 0;
  useEffect(() => {
    if (!hasReady) return;
    void listVoices().then((result) => {
      if (result.status === "ok") setVoices(result.voices);
    });
  }, [hasReady]);

  if (ready.length === 0 || video.unconfigured) return null;

  const selected = ready.find((t) => t.id === avatarId) ?? ready[0]!;
  const voiceId = voiceChoice[selected.id] ?? selected.voiceId ?? "";
  const busy = video.starting || (video.job !== null && !isFinished(video.job));
  const knownVoice = voices.some((v) => v.voice_id === voiceId);

  const changeVoice = async (next: string) => {
    setVoiceError(null);
    const previous = voiceId;
    setVoiceChoice((current) => ({ ...current, [selected.id]: next }));
    const result = await selectTwinVoice(selected.id, next);
    if (result.status === "error") {
      setVoiceChoice((current) => ({ ...current, [selected.id]: previous }));
      setVoiceError(result.message);
    }
  };

  return (
    <section aria-label="Make a video with your avatar" className="mt-10 border-t border-hairline pt-8">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Make a video</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Write a script and your avatar will say it. This takes a few minutes; you can leave this page open.
      </p>

      <div className="mt-4 grid max-w-xl gap-3">
        {ready.length > 1 ? (
          <div className="grid gap-1.5">
            <label htmlFor={avatarFieldId} className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
              Avatar
            </label>
            <select
              id={avatarFieldId}
              value={selected.id}
              onChange={(event) => setAvatarId(event.target.value)}
              disabled={busy}
              className={`${FIELD} h-9`}
            >
              {ready.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name ?? "Untitled avatar"}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <label htmlFor={voiceFieldId} className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            Voice
          </label>
          <select
            id={voiceFieldId}
            value={voiceId}
            onChange={(event) => void changeVoice(event.target.value)}
            disabled={busy}
            className={`${FIELD} h-9`}
          >
            {!knownVoice && voiceId !== "" ? <option value={voiceId}>Your avatar&apos;s voice</option> : null}
            {voices.map((v) => (
              <option key={v.voice_id} value={v.voice_id}>
                {v.scope === "own" ? v.name : `${v.name}${v.gender ? ` (${v.gender})` : ""}`}
              </option>
            ))}
          </select>
          {voiceError ? (
            <p role="alert" className="text-xs text-destructive">
              {voiceError}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor={scriptId} className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            Script
          </label>
          <textarea
            id={scriptId}
            value={script}
            onChange={(event) => setScript(event.target.value)}
            maxLength={SCRIPT_LIMIT}
            rows={5}
            disabled={busy || video.job !== null}
            placeholder="What should your avatar say?"
            className={`${FIELD} resize-y py-2`}
          />
          <p className="text-right text-[11px] text-ink-soft">
            {script.length} / {SCRIPT_LIMIT}
          </p>
        </div>

        {video.job === null ? (
          <button
            type="button"
            onClick={() => video.start(selected.id, script)}
            disabled={video.starting || script.trim() === ""}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {video.starting ? <Spinner className="size-3.5" /> : <Clapperboard className="size-3.5" aria-hidden />}
            {video.starting ? "Starting" : "Make video"}
          </button>
        ) : (
          <VideoStatus job={video.job} onAgain={video.reset} />
        )}

        {video.error ? (
          <p role="alert" className="text-xs text-destructive">
            {video.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
