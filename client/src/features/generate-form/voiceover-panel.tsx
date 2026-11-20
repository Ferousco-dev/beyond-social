"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { wordCount } from "./pacing";
import { voiceoverFit, voiceoverMatches, voiceoverOf } from "./storyboard";
import { adoptVoiceover, startVoiceover, voiceoverLink, voiceoverStatus } from "./voiceover-actions";
import type { GenerateFormValues } from "./types";

const POLL_MS = 3000;
const MAX_POLLS = 60;

/** Reads a recording's real length from the file, which is free and exact. */
function audioSeconds(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const timer = window.setTimeout(() => reject(new Error("timeout")), 20_000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("unreadable"));
    };
    audio.src = url;
  });
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * One voiceover for the whole video. The shots are made silent and this single
 * recording is laid over them, so the voice cannot change from clip to clip.
 */
export function VoiceoverPanel({ values, onChange }: { values: GenerateFormValues; onChange: (patch: Partial<GenerateFormValues>) => void }) {
  const plan = values.storyboard;
  const made = values.voiceover;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const voice = values.voice;
  // A second click while one is out would pay twice.
  const inFlight = useRef(false);
  const text = plan ? voiceoverOf(plan) : "";
  const words = wordCount(text);
  const current = plan !== null && voiceoverMatches(plan, made);

  // Links expire, so a voiceover made earlier gets a fresh one to listen to.
  useEffect(() => {
    if (!current || !made) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void voiceoverLink(made.mediaId).then((link) => {
      if (!cancelled) setUrl(link);
    });
    return () => {
      cancelled = true;
    };
  }, [current, made]);

  if (!plan) return null;

  async function make(): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const started = await startVoiceover({ text, key: crypto.randomUUID(), voice });
      if (!started.ok) return setError(started.message);
      for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        await pause(POLL_MS);
        const status = await voiceoverStatus(started.jobId);
        if (status.state === "failed") return setError(status.message);
        if (status.state !== "done") continue;
        const adopted = await adoptVoiceover(started.jobId);
        if (!adopted.ok) return setError(adopted.message);
        const link = adopted.url;
        if (!link) return setError("The voiceover was made but could not be opened. Try again.");
        const seconds = await audioSeconds(link);
        onChange({ voiceover: { mediaId: adopted.mediaId, seconds, text, voice } });
        setUrl(link);
        return;
      }
      setError("The voiceover is taking longer than usual. It may still finish; check again in a minute.");
    } catch {
      setError("The voiceover could not be made. Try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const fit = current && made ? voiceoverFit(made.seconds, values.seconds, words) : null;

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-hairline p-3" aria-label="Voiceover">
      <h4 className="text-sm font-semibold text-ink">Voiceover</h4>
      {words === 0 ? (
        <p className="text-xs text-ink-soft">No shot says anything yet, so there is nothing to record. Add what is said to a shot to make a voiceover.</p>
      ) : (
        <>
          <p className="text-xs text-ink-soft">
            One recording in one voice for the whole video ({words} words, about {Math.round(words / 2.5)}s). The shots are made silent and the recording is laid over them, so the voice never changes between parts. Uses a few credits, returned if it fails. Without it, every part is made with its own voice.
          </p>
          {current && made && url ? <audio controls preload="metadata" src={url} className="w-full" aria-label="Voiceover recording" /> : null}
          {current && made ? (
            <p className="text-xs text-ink tabular-nums" role="status">
              Recording is {made.seconds.toFixed(1)}s, video is {values.seconds}s.
              {fit?.kind === "fits" ? " They fit." : null}
              {made.voice !== undefined && made.voice !== voice ? " This was recorded in a different voice from the one chosen above. Record again to use it." : null}
              {fit?.kind === "long" ? ` The recording is ${fit.seconds}s too long and would be cut off: trim about ${fit.words} words or choose a longer video.` : null}
              {fit?.kind === "short" ? ` The recording ends ${fit.seconds}s early, leaving silence at the end. Add about ${fit.words} words or choose a shorter video.` : null}
            </p>
          ) : made ? (
            <p className="text-xs text-ink" role="status">The words changed since this was recorded. Make it again to match.</p>
          ) : null}
          <button
            type="button"
            onClick={() => void make()}
            disabled={busy}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-full border border-hairline px-3.5 text-[13px] text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
            {busy ? "Recording…" : current ? "Record again" : "Make the voiceover"}
          </button>
        </>
      )}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
