/**
 * The voices a voiceover can be read in. Each id was confirmed with a real
 * request to the speech provider; ids are never guessed, because the provider
 * only accepts ids from its own list. Keep in step with Voices in
 * server/internal/kietools/kietools.go, which refuses any id not listed there.
 */
export interface VoiceChoice {
  readonly id: string;
  readonly name: string;
  readonly note: string;
}

export const VOICES: readonly VoiceChoice[] = [
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", note: "Steady broadcaster" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", note: "Mature, reassuring, confident" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", note: "Warm, captivating storyteller" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", note: "Playful, bright, warm" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", note: "Energetic social media creator" },
];

export const DEFAULT_VOICE: string = VOICES[0]?.id ?? "";

/** A short sample the provider hosts, so a voice can be heard before any credit is spent. */
export const voicePreviewUrl = (id: string): string => `https://static.aiquickdraw.com/elevenlabs/voice/${id}.mp3`;
