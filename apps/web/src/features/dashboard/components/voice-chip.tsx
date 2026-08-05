"use client";

import { AudioLines, Pause, Play, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { type PendingVoice } from "../hooks/use-voice-upload";

export function VoiceChip({ voice, onRemove }: { voice: PendingVoice; onRemove: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    if (!voice.url) return;
    if (!audioRef.current) {
      const audio = new Audio(voice.url);
      audio.addEventListener("ended", () => setPlaying(false));
      audioRef.current = audio;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  }, [voice.url, playing]);

  return (
    <div className="mx-1 mb-2 flex items-center gap-3 rounded-2xl border border-hairline bg-canvas p-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={!voice.url}
        aria-label={playing ? "Pause preview" : "Play preview"}
        className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:cursor-default disabled:opacity-50"
      >
        {playing ? <Pause className="size-4" /> : voice.url ? <Play className="size-4" /> : <AudioLines className="size-5" />}
      </button>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{voice.name}</span>
        <span className="block text-xs text-ink-soft">Your voice</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${voice.name}`}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
