"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";

import { MAX_SHOT, MIN_SHOT, type Shot } from "./storyboard.ts";

export type WriteStoryboardResult =
  | { readonly ok: true; readonly title: string; readonly look: string; readonly shots: readonly Shot[] }
  | { readonly ok: false; readonly message: string; readonly code?: string };

const inputSchema = z.object({
  script: z.string().trim().min(1).max(8000),
  seconds: z.number().int().min(15).max(180),
  look: z.string().max(1200).default(""),
  language: z.string().max(40).default(""),
});

const responseSchema = z.object({
  data: z.object({
    title: z.string(),
    look: z.string(),
    shots: z.array(
      z.object({
        seconds: z.number().int().min(MIN_SHOT).max(MAX_SHOT),
        visual: z.string(),
        camera: z.string(),
        voiceover: z.string(),
        on_screen_text: z.string(),
      }),
    ),
  }),
});

/** Plans the video for the chosen length from the script. Costs credits, returned if it fails. */
export async function writeStoryboard(input: z.input<typeof inputSchema>): Promise<WriteStoryboardResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Write the script and pick a length of 15 seconds to 3 minutes first." };
  // Generous: the model writes up to 45 shots.
  const result = await goApi("/api/v1/storyboard", responseSchema, { method: "POST", body: parsed.data, timeoutMs: 90_000 });
  if (!result.ok) return { ok: false, message: result.message, code: result.code };
  const { title, look, shots } = result.data.data;
  return {
    ok: true,
    title,
    look,
    shots: shots.map((shot) => ({ id: crypto.randomUUID(), seconds: shot.seconds, visual: shot.visual, camera: shot.camera, voiceover: shot.voiceover, onScreenText: shot.on_screen_text })),
  };
}
