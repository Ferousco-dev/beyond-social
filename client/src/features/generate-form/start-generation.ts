import { createConversation, createLiveAvatar, quoteLiveAvatar } from "@/features/live-avatar-flow/actions";
import { startScene } from "@/features/studio/assist-actions";
import type { ProjectGeneration } from "@/features/studio/core/types";

import { avatarDirection, buildAvatarScript, buildPrompt } from "./brief";
import { planLongVideo } from "./long-video";
import { hasSound, isLong } from "./pacing";
import { cachedLongQuote, cachedSceneQuote } from "./scene-quotes";
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
      return isLong(values.seconds) ? cachedLongQuote(values.seconds, hasSound(values)) : cachedSceneQuote(values.seconds, hasSound(values));
  }
}

/** What every part of a long video shares: the look, the place and the people, not the story. */
export function longSetting(values: GenerateFormValues): string {
  return [
    values.objective !== "" ? `Objective: ${values.objective}` : "",
    values.visualStyle,
    values.environment !== "" ? `Setting: ${values.environment}` : "",
    values.contentKind !== "" ? `${values.contentKind} video` : "",
    values.product !== "" ? `Featuring: ${values.product}` : "",
    values.tone !== "" ? `Tone: ${values.tone}` : "",
    values.language !== "" ? `In ${values.language}` : "",
  ]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join("\n");
}

/** The story of a long video, in order: the opening, the scenes, what is said and the closing line. */
export function longStory(values: GenerateFormValues): string {
  return [values.hook, values.scenes, values.dialogue, values.cta].map((part) => part.trim()).filter((part) => part !== "").join("\n");
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
      const sound = hasSound(values);
      if (isLong(values.seconds)) {
        const plan = planLongVideo({ setting: longSetting(values), story: longStory(values), totalSeconds: values.seconds });
        const keys = plan.map(() => crypto.randomUUID());
        const firstPart = plan[0];
        const firstKey = keys[0];
        if (!firstPart || !firstKey) return { ok: false, message: "That video could not be planned. Try again." };
        // The first clip starts now, which checks the credits and the server before anything is saved; the editor starts the rest as slots free up.
        const first = await startScene({
          prompt: firstPart.prompt,
          seconds: firstPart.seconds,
          key: firstKey,
          aspectRatio: values.aspectRatio,
          sound,
          notifyEmail: false,
          ...(values.firstFrameId !== "" ? { imageMediaId: values.firstFrameId } : {}),
        });
        if (!first.ok) return { ok: false, message: first.message };
        return {
          ok: true,
          generation: {
            jobId: first.jobId,
            script,
            state: "running",
            generator: "long",
            aspectRatio: values.aspectRatio,
            sound,
            ...(values.firstFrameId !== "" ? { imageMediaId: values.firstFrameId } : {}),
            parts: plan.map((part, index) => ({
              key: keys[index] ?? crypto.randomUUID(),
              prompt: part.prompt,
              seconds: part.seconds,
              state: index === 0 ? ("running" as const) : ("pending" as const),
              ...(index === 0 ? { jobId: first.jobId } : {}),
            })),
          },
        };
      }
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
