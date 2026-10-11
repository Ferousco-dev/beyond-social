"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The shape of the recording, drawn from the recording.
 *
 * Decoded from the audio rather than faked. A row of bars that does not come
 * from the file is a picture of a waveform, and a picture of somebody's voice
 * that is not their voice is the kind of detail that quietly teaches people not
 * to trust the rest of the screen.
 *
 * `decodeAudioData` needs the whole file, which is a few hundred kilobytes of a
 * clip this short, and it runs once per mount. Until it resolves there is a
 * flat baseline rather than a guess.
 */

const BARS = 72;

function summarise(buffer: AudioBuffer, bars: number): readonly number[] {
  const data = buffer.getChannelData(0);
  const per = Math.floor(data.length / bars) || 1;
  const peaks: number[] = [];

  for (let bar = 0; bar < bars; bar += 1) {
    let peak = 0;
    const start = bar * per;
    for (let i = start; i < start + per && i < data.length; i += 1) {
      const value = Math.abs(data[i] ?? 0);
      if (value > peak) peak = value;
    }
    peaks.push(peak);
  }

  // Normalised against the loudest moment, so a quiet recording still fills the
  // panel instead of reading as a failed one.
  const loudest = Math.max(...peaks, 0.01);
  return peaks.map((peak) => peak / loudest);
}

export function Waveform({
  url,
  progress,
  className,
}: {
  url: string;
  /** 0 to 1, how far through playback, so the played part can lead the rest. */
  progress: number;
  className?: string;
}): ReactNode {
  const [peaks, setPeaks] = useState<readonly number[] | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    setPeaks(null);

    void (async () => {
      try {
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        const context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes);
        await context.close();
        if (!cancelled.current) setPeaks(summarise(buffer, BARS));
      } catch {
        // A clip that cannot be decoded still plays; it just draws flat. The
        // player below is the control that matters and it is unaffected.
        if (!cancelled.current) setPeaks([]);
      }
    })();

    return () => {
      cancelled.current = true;
    };
  }, [url]);

  const bars = peaks ?? [];
  const played = Math.round(bars.length * progress);

  return (
    <div className={className} aria-hidden>
      <div className="flex h-full w-full items-center gap-[2px]">
        {(bars.length > 0 ? bars : Array.from({ length: BARS }, () => 0)).map((peak, index) => (
          <span
            key={index}
            className={`w-full rounded-full transition-colors ${
              index < played ? "bg-primary" : "bg-primary/35"
            }`}
            style={{ height: `${Math.max(6, peak * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
