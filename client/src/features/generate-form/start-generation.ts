import { createConversation, createLiveAvatar, quoteLiveAvatar } from "@/features/live-avatar-flow/actions";
import { startScene } from "@/features/studio/assist-actions";
import type { ProjectGeneration } from "@/features/studio/core/types";

import { avatarDirection, buildAvatarScript, buildPrompt } from "./brief";
import { cachedSceneQuote } from "./scene-quotes";
import { isTalking, type GenerateFormValues } from "./types";

export type VideoKind = "clip" | "talking" | "conversation";

export function videoKind(values: GenerateFormValues): VideoKind {
  if (values.speakerMode === "conversation") return "conversation";
  return isTalking(values) ? "talking" : "clip";
}

/** What the video is made from: the clip prompt, or the words that are spoken. */
export function scriptOf(values: GenerateFormValues): string {
  switch (videoKind(values)) {
    case "conversation":
      return values.turns.map((turn, index) => `Turn ${index + 1}: ${turn.words.trim()}`).join("\n");
    case "talking":
      return buildAvatarScript(values);
    case "clip":
      return buildPrompt(values);
  }
}

/** The credit cost: one clip, one talking video, or one talking video per turn. */
export async function quoteGeneration(values: GenerateFormValues): Promise<number | null> {
  switch (videoKind(values)) {
    case "conversation":
      return quoteLiveAvatar({ voiceAssetIds: values.turns.map((turn) => turn.voiceAssetId) });
    case "talking":
      return quoteLiveAvatar({ voiceAssetIds: [values.voiceAssetId] });
    case "clip":
      return cachedSceneQuote(values.seconds);
  }
}

export type Started =
  | { readonly ok: true; readonly generation: ProjectGeneration }
  | { readonly ok: false; readonly message: string };

/** Starts the right kind of generation and describes it for the editor to follow. */
export async function startGeneration(values: GenerateFormValues): Promise<Started> {
  const direction = (videoKind(values) === "clip" ? buildPrompt(values) : avatarDirection(values)).slice(0, 2000);
  const script = scriptOf(values);
  const key = crypto.randomUUID();

  switch (videoKind(values)) {
    case "conversation": {
      const result = await createConversation({ turns: values.turns, prompt: direction, idempotencyKey: key });
      if (result.status !== "ok") return { ok: false, message: result.status === "unconfigured" ? "Conversations are not available right now." : result.message };
      const [first] = result.jobs;
      if (!first) return { ok: false, message: "No turn could start. Try again." };
      const turns = result.jobs.map((job, index) => {
        const turn = values.turns[index];
        return { jobId: job.id, faceAssetId: turn?.faceAssetId ?? "", voiceAssetId: turn?.voiceAssetId ?? "", words: turn?.words ?? "", state: "running" as const };
      });
      return {
        ok: true,
        generation: { jobId: first.id, script, state: "running", generator: "conversation", direction, turns, ...(result.warning ? { message: result.warning } : {}) },
      };
    }
    case "talking": {
      const result = await createLiveAvatar({ faceAssetId: values.faceAssetId, voiceAssetId: values.voiceAssetId, script, prompt: direction, idempotencyKey: key });
      if (result.status !== "ok") return { ok: false, message: result.status === "unconfigured" ? "Talking videos are not available right now." : result.message };
      return {
        ok: true,
        generation: { jobId: result.job.id, script, state: "running", generator: "live-avatar", faceAssetId: values.faceAssetId, voiceAssetId: values.voiceAssetId, direction },
      };
    }
    case "clip": {
      const sound = values.dialogue.trim() !== "";
      const image = values.firstFrameId !== "" ? { imageMediaId: values.firstFrameId } : {};
      const result = await startScene({ prompt: script, seconds: values.seconds, key, aspectRatio: values.aspectRatio, sound, notifyEmail: values.notifyEmail, ...image });
      if (!result.ok) return { ok: false, message: result.message };
      return {
        ok: true,
        generation: { jobId: result.jobId, script, state: "running", generator: "kie", seconds: values.seconds, aspectRatio: values.aspectRatio, sound, notifyEmail: values.notifyEmail, ...image },
      };
    }
  }
}
