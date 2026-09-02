"use client";

import { Mic, Pause, Play, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { type VoiceProfile } from "@/features/voice/actions";

import { Waveform } from "./waveform";

/**
 * The saved voice, with its own recording drawn and playable.
 *
 * Every number here comes from the file. The duration is the audio element's
 * own, the progress is where playback actually is, and the bars are decoded
 * from the clip. None of it is styling standing in for data, which matters more
 * here than anywhere else on the page: this panel is somebody's voice, and a
 * fake reading of it is a fake reading of them.
 *
 * A clip is used as recorded. Nothing here clones a voice or synthesises new
 * speech from it, and the copy says so rather than implying otherwise.
 */

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function VoicePanel({
  profile,
  onRecord,
}: {
  profile: VoiceProfile | null;
  /** Scrolls to the recorder below, which is the control that actually records. */
  onRecord: () => void;
}): ReactNode {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setElapsed(0);
    setTotal(0);
    if (!profile?.url) {
      audioRef.current = null;
      return;
    }
    const audio = new Audio(profile.url);
    audioRef.current = audio;
    const onMeta = (): void => setTotal(audio.duration);
    const onTime = (): void => setElapsed(audio.currentTime);
    const onEnd = (): void => {
      setPlaying(false);
      setElapsed(0);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [profile?.url]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(() => setPlaying(true));
  }, [playing]);

  const progress = total > 0 ? elapsed / total : 0;

  return (
    <section
      aria-labelledby="voice-heading"
      className="flex min-h-[360px] flex-col rounded-2xl border border-hairline bg-paper p-6 sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <Mic className="size-4.5" aria-hidden />
          </span>
          <h2 id="voice-heading" className="text-base font-semibold text-ink">
            Voice profile
          </h2>
        </div>
        {profile !== null && total > 0 ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
            {clock(total)}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {profile === null
          ? "Read one line aloud and the clip is kept here, ready to narrate a video."
          : "Your recording, used as you said it. Nothing here clones your voice or makes it say anything new."}
      </p>

      {profile?.url ? (
        <>
          <Waveform url={profile.url} progress={progress} className="mt-6 h-24 w-full" />

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-hairline bg-canvas px-3 py-2.5">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause your recording" : "Play your recording"}
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {playing ? (
                <Pause className="size-4" aria-hidden />
              ) : (
                <Play className="size-4 translate-x-px" aria-hidden />
              )}
            </button>
            <span className="text-xs tabular-nums text-ink-soft">{clock(elapsed)}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-cloud">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-ink-soft">{clock(total)}</span>
            <Volume2 className="size-4 shrink-0 text-ink-soft" aria-hidden />
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-hairline">
          <p className="px-6 text-center text-sm text-ink-soft">
            No recording saved yet. It takes about twenty seconds.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onRecord}
        className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Mic className="size-4" aria-hidden />
        {profile === null ? "Record a sample" : "Record again"}
      </button>
    </section>
  );
}
