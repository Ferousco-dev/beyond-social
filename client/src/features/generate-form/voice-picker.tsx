"use client";

import { Pause, Play, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { VOICES, voicePreviewUrl } from "./voices";

/** A calm, steady colour for each voice, so the cards are told apart at a glance. */
function tint(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return `hsl(${hash} 28% 82%)`;
}

/**
 * The voices a long video can be read in. Each card has a default picture and a
 * play button in the middle to hear a sample before choosing; playing a sample
 * also chooses that voice, and only one sample plays at a time.
 */
export function VoicePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  function toggle(id: string): void {
    onChange(id);
    setFailed(false);
    if (playing === id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const next = new Audio(voicePreviewUrl(id));
    next.onended = () => setPlaying((current) => (current === id ? null : current));
    next.onerror = () => {
      setPlaying(null);
      setFailed(true);
    };
    audio.current = next;
    setPlaying(id);
    next.play().catch(() => {
      setPlaying(null);
      setFailed(true);
    });
  }

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Voice">
      <span className="text-sm font-medium text-ink">Voice</span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {VOICES.map((voice) => {
          const selected = voice.id === value;
          const active = playing === voice.id;
          return (
            <div
              key={voice.id}
              className={cn("flex w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border p-2 text-center transition-colors", selected ? "border-ink bg-cloud" : "border-hairline bg-paper")}
            >
              <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: tint(voice.id) }}>
                <User className="absolute -bottom-2 size-11 fill-paper/70 text-paper/70" aria-hidden />
                <button
                  type="button"
                  onClick={() => toggle(voice.id)}
                  aria-label={`${active ? "Pause" : "Play"} a sample of ${voice.name}`}
                  className="absolute inset-0 m-auto flex size-8 cursor-pointer items-center justify-center rounded-full bg-ink/85 text-paper shadow-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
                >
                  {active ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 translate-x-px" aria-hidden />}
                </button>
              </div>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(voice.id)}
                className="flex min-h-9 w-full cursor-pointer flex-col items-center rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="text-sm font-medium text-ink">{voice.name}</span>
              </button>
            </div>
          );
        })}
      </div>
      {failed ? (
        <p role="alert" className="text-xs text-destructive">
          That sample could not be played. You can still choose the voice.
        </p>
      ) : (
        <p className="text-xs text-ink-soft">{VOICES.find((voice) => voice.id === value)?.note}. One voice reads the whole video.</p>
      )}
    </div>
  );
}
