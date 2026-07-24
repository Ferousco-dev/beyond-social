export interface VideoDraft {
  readonly caption: string;
  readonly status: "generating" | "ready";
  // Present once a real kie.ai generation resolves; absent for the demo path.
  readonly resultUrl?: string;
}

export interface Message {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly draft?: VideoDraft;
}

// Placeholder thread shown when opening an existing project.
export const SAMPLE_MESSAGES: readonly Message[] = [
  {
    id: "m1",
    role: "user",
    content:
      "Make a 30-second video introducing our new trail running shoe. Upbeat, for Instagram.",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Here is a first cut. I opened on the shoe in motion, then three benefit beats with captions. Want me to adjust the pacing or swap the music?",
    draft: { caption: "New arrivals just dropped", status: "ready" },
  },
];

export function makeAssistantReply(_prompt: string): string {
  return "On it. I put together a first draft based on that. Take a look and tell me what to adjust: the pacing, the captions, or the music.";
}
